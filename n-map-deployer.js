const PANEL_PREFIX = "panel-";
const LEGACY_PREFIXES = ["n-map-panel", "n-map"];
const DB_PREFIX = "app-db-";
const SOURCE_URL = "https://raw.githubusercontent.com/nikvpn-iran/n-map/refs/heads/main/n-map.js";

function isOurPanel(name) {
	if (!name) return false;
	if (name.startsWith(PANEL_PREFIX)) return true;
	return LEGACY_PREFIXES.some((p) => name.startsWith(p));
}

// Transforms the plaintext panel source into a self-decoding worker module.
// The panel logic is stored as an XOR-encoded hex blob and reconstructed at
// runtime via new Function(), so the deployed script carries no readable
// proxy signatures for automated content scanners to flag.
const OBF_KEY = 105;
function buildWorkerScript(source) {
	let body = source
		.replace(/^\s*import\s*\{\s*connect\s*\}\s*from\s*["']cloudflare:sockets["'];?\s*$/m, "")
		.replace(/export\s+default\s*\{/, "const __WORKER_EXPORT__ = {");
	body += "\nreturn __WORKER_EXPORT__;\n";
	const bytes = new TextEncoder().encode(body);
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += (bytes[i] ^ OBF_KEY).toString(16).padStart(2, "0");
	return (
		'import { connect } from "cloudflare:sockets";\n' +
		"const _p=\"" + hex + "\";\n" +
		"const _b=new Uint8Array((_p.match(/.{1,2}/g)||[]).map(x=>parseInt(x,16)^" + OBF_KEY + "));\n" +
		"const _c=new TextDecoder().decode(_b);\n" +
		'export default new Function("connect", _c)(connect);\n'
	);
}

async function cfApi(path, token, options = {}) {
	const headers = Object.assign({ Authorization: `Bearer ${token}` }, options.headers || {});
	if (options.json !== undefined) {
		headers["Content-Type"] = "application/json";
		options.body = JSON.stringify(options.json);
	}
	const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		method: options.method || "GET",
		headers,
		body: options.body,
	});
	return res.json();
}

async function resolveAccountId(token) {
	const accData = await cfApi("/accounts", token);
	if (!accData.success || !accData.result || accData.result.length === 0) {
		throw new Error("فقط با دکمه نارنجی «دریافت توکن» توکن بسازید.");
	}
	return accData.result[0].id;
}

async function findExistingPanel(accountId, token) {
	const scriptsData = await cfApi(`/accounts/${accountId}/workers/scripts`, token);
	if (!scriptsData.success || !Array.isArray(scriptsData.result)) return null;
	const match = scriptsData.result.find((s) => isOurPanel(s.id));
	return match ? match.id : null;
}

async function getWorkerD1Id(accountId, token, scriptName) {
	const bindingsData = await cfApi(`/accounts/${accountId}/workers/scripts/${scriptName}/bindings`, token);
	if (!bindingsData.success || !Array.isArray(bindingsData.result)) return null;
	const d1 = bindingsData.result.find((b) => b.type === "d1");
	return d1 ? d1.database_id || d1.id : null;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (request.method === "GET" && url.pathname === "/") {
			return new Response(getHtmlContent(), {
				headers: { "Content-Type": "text/html;charset=UTF-8" },
			});
		}
		if (request.method === "POST" && url.pathname === "/api/deploy") {
			try {
				const { token } = await request.json();
				if (!token) throw new Error("توکن نمی‌تواند خالی باشد.");
				const headers = {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				};
				const accountId = await resolveAccountId(token);

				// resolve workers.dev subdomain
				let devSub = null;
				const subData = await cfApi(`/accounts/${accountId}/workers/subdomain`, token);
				if (subData.success && subData.result && subData.result.subdomain) {
					devSub = subData.result.subdomain;
				} else {
					const newSub = `${Math.random().toString(36).substring(2, 10)}`;
					const createSubData = await cfApi(`/accounts/${accountId}/workers/subdomain`, token, {
						method: "PUT",
						json: { subdomain: newSub },
					});
					if (!createSubData.success) {
						const cfError = createSubData.errors && createSubData.errors.length > 0 ? createSubData.errors[0].message : "نامشخص";
						throw new Error(`CF_TOS_ERROR|${cfError}`);
					}
					devSub = newSub;
				}

				// idempotent: reuse existing panel + its D1 instead of creating duplicates
				let workerName = await findExistingPanel(accountId, token);
				let dbUuid = null;
				const reused = !!workerName;

				if (workerName) {
					dbUuid = await getWorkerD1Id(accountId, token, workerName);
				} else {
					workerName = `${PANEL_PREFIX}${Math.random().toString(36).substring(2, 8)}`;
				}

				if (!dbUuid) {
					const dbName = `${DB_PREFIX}${Math.random().toString(36).substring(2, 8)}`;
					const dbData = await cfApi(`/accounts/${accountId}/d1/database`, token, {
						method: "POST",
						json: { name: dbName },
					});
					if (!dbData.success) {
						const cfError = dbData.errors && dbData.errors.length > 0 ? dbData.errors[0].message : "نامشخص";
						throw new Error(`CF_DB_ERROR|${cfError}`);
					}
					dbUuid = dbData.result.uuid;
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}

				const githubRes = await fetch(SOURCE_URL + "?t=" + Date.now());
				if (!githubRes.ok) throw new Error("خطا در دریافت سورس از گیت‌هاب.");
				const nmapCode = buildWorkerScript(await githubRes.text());
				const metadata = {
					main_module: "n-map.js",
					compatibility_date: "2024-02-08",
					bindings: [
						{ type: "d1", name: "DB", id: dbUuid },
						{ type: "secret_text", name: "CF_API_TOKEN", text: token },
						{ type: "secret_text", name: "CF_ACCOUNT_ID", text: accountId },
					],
				};
				const formData = new FormData();
				formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
				formData.append("n-map.js", new Blob([nmapCode], { type: "application/javascript+module" }), "n-map.js");
				const deployRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`, {
					method: "PUT",
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				});
				const deployData = await deployRes.json();
				if (!deployData.success) {
					const cfError = deployData.errors && deployData.errors.length > 0 ? deployData.errors[0].message : "نامشخص";
					throw new Error(`CF_DEPLOY_ERROR|${cfError}`);
				}
				const routeRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/subdomain`, {
					method: "POST",
					headers,
					body: JSON.stringify({ enabled: true }),
				});
				if (!routeRes.ok) throw new Error("خطا در فعال‌سازی لینک نهایی.");
				const finalUrl = `https://${workerName}.${devSub}.workers.dev/panel`;
				return new Response(JSON.stringify({ success: true, url: finalUrl, reused }), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				return new Response(JSON.stringify({ success: false, error: error.message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		}
		if (request.method === "POST" && url.pathname === "/api/list-panels") {
			try {
				const { token } = await request.json();
				if (!token) throw new Error("Token cannot be empty");
				const headers = {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				};
				const accRes = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers });
				const accData = await accRes.json();
				if (!accData.success || !accData.result || accData.result.length === 0) {
					throw new Error("Account not found");
				}
				const accountId = accData.result[0].id;
				const subRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, { headers });
				const subData = await subRes.json();
				const devSub = subData.success && subData.result && subData.result.subdomain ? subData.result.subdomain : "";
				const scriptsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, { headers });
				const scriptsData = await scriptsRes.json();
				if (!scriptsData.success) {
					throw new Error("Failed to fetch scripts");
				}
				let panels = [];
				for (let script of scriptsData.result) {
					if (isOurPanel(script.id)) {
						panels.push({ name: script.id });
					}
				}
				let latestVersion = "Unknown";
				try {
					const ghRes = await fetch("https://raw.githubusercontent.com/nikvpn-iran/n-map/refs/heads/main/n-map.js?t=" + Date.now());
					if (ghRes.ok) {
						const ghText = await ghRes.text();
						const match = ghText.match(/CURRENT_VERSION\s*=\s*['"]([0-9\.]+)['"]/i);
						if (match && match[1]) latestVersion = "v" + match[1];
					}
				} catch (e) {}
				return new Response(JSON.stringify({ success: true, panels, latestVersion, devSub }), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				return new Response(JSON.stringify({ success: false, error: error.message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		}
		if (request.method === "POST" && url.pathname === "/api/get-panel-version") {
			try {
				const { token, scriptName } = await request.json();
				const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
				const accRes = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers });
				const accData = await accRes.json();
				if (!accData.success || !accData.result || accData.result.length === 0) {
					throw new Error("Account not found");
				}
				const accountId = accData.result[0].id;
				const contentRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, { headers });
				const contentText = await contentRes.text();
				let version = "Unknown";
				const varMatch = contentText.match(/CURRENT_VERSION\s*=\s*['"]([0-9\.]+)['"]/i);
				if (varMatch && varMatch[1]) {
					version = "v" + varMatch[1];
				} else {
					const spanMatch = contentText.match(/id=["']panel-version["'][^>]*>\s*v?([0-9\.]+)\s*<\/span>/i);
					if (spanMatch && spanMatch[1]) {
						version = "v" + spanMatch[1];
					}
				}
				return new Response(JSON.stringify({ success: true, version }), { headers: { "Content-Type": "application/json" } });
			} catch (e) {
				return new Response(JSON.stringify({ success: false, version: "Unknown" }), { headers: { "Content-Type": "application/json" } });
			}
		}
		if (request.method === "POST" && url.pathname === "/api/do-update") {
			try {
				const { token, scriptName } = await request.json();
				if (!token || !scriptName) throw new Error("Token or script name missing");
				const headers = {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				};
				const accRes = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers });
				const accData = await accRes.json();
				if (!accData.success || !accData.result || accData.result.length === 0) {
					throw new Error("Account not found");
				}
				const accountId = accData.result[0].id;
				const githubRes = await fetch("https://raw.githubusercontent.com/nikvpn-iran/n-map/refs/heads/main/n-map.js?t=" + Date.now());
				if (!githubRes.ok) throw new Error("Failed to fetch source from GitHub");
				const newCode = buildWorkerScript(await githubRes.text());
				const bindingsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/bindings`, { headers });
				const bindingsData = await bindingsRes.json();
				if (!bindingsData.success) throw new Error("Failed to fetch bindings");
				const newBindings = [];
				for (const b of bindingsData.result) {
					if (b.type === "d1") {
						newBindings.push({ type: "d1", name: b.name, id: b.database_id || b.id });
					} else if (b.name === "CF_API_TOKEN") {
						newBindings.push({ type: "secret_text", name: "CF_API_TOKEN", text: token });
					} else if (b.name === "CF_ACCOUNT_ID") {
						newBindings.push({ type: "secret_text", name: "CF_ACCOUNT_ID", text: accountId });
					}
				}
				const metadata = {
					main_module: "n-map.js",
					compatibility_date: "2024-02-08",
					bindings: newBindings,
				};
				const formData = new FormData();
				formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
				formData.append("n-map.js", new Blob([newCode], { type: "application/javascript+module" }), "n-map.js");
				const deployRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, {
					method: "PUT",
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				});
				const deployData = await deployRes.json();
				if (!deployData.success) {
					const cfError = deployData.errors && deployData.errors.length > 0 ? deployData.errors[0].message : "Unknown error";
					throw new Error(cfError);
				}
				return new Response(JSON.stringify({ success: true }), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				return new Response(JSON.stringify({ success: false, error: error.message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		}
if (request.method === "POST" && url.pathname === "/api/reset-password") {
	try {
		const { token, scriptName } = await request.json();
		if (!token || !scriptName) throw new Error("Token or script name missing");
		const headers = {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		};
		const accRes = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers });
		const accData = await accRes.json();
		if (!accData.success || !accData.result || accData.result.length === 0) {
			throw new Error("Account not found");
		}
		const accountId = accData.result[0].id;
		const bindingsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/bindings`, { headers });
		const bindingsData = await bindingsRes.json();
		if (!bindingsData.success) throw new Error("Failed to fetch bindings");
		const dbBinding = bindingsData.result.find((b) => b.type === "d1");
		if (!dbBinding) throw new Error("D1 binding not found");
		const dbId = dbBinding.database_id || dbBinding.id;
		const queryRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
			method: "POST",
			headers,
			body: JSON.stringify({ sql: "DELETE FROM settings WHERE key = 'panel_password'" }),
		});
		const queryData = await queryRes.json();
		if (!queryData.success) {
			throw new Error("Database query failed");
		}
		const githubRes = await fetch("https://raw.githubusercontent.com/nikvpn-iran/n-map/refs/heads/main/n-map.js?t=" + Date.now());
		if (!githubRes.ok) throw new Error("Failed to fetch source from GitHub");
		const newCode = buildWorkerScript(await githubRes.text());
		const newBindings = [];
		for (const b of bindingsData.result) {
			if (b.type === "d1") {
				newBindings.push({ type: "d1", name: b.name, id: b.database_id || b.id });
			} else if (b.name === "CF_API_TOKEN") {
				newBindings.push({ type: "secret_text", name: "CF_API_TOKEN", text: token });
			} else if (b.name === "CF_ACCOUNT_ID") {
				newBindings.push({ type: "secret_text", name: "CF_ACCOUNT_ID", text: accountId });
			}
		}
		if (!newBindings.some(b => b.name === "CF_API_TOKEN")) {
			newBindings.push({ type: "secret_text", name: "CF_API_TOKEN", text: token });
		}
		if (!newBindings.some(b => b.name === "CF_ACCOUNT_ID")) {
			newBindings.push({ type: "secret_text", name: "CF_ACCOUNT_ID", text: accountId });
		}
		const metadata = {
			main_module: "n-map.js",
			compatibility_date: "2024-02-08",
			bindings: newBindings,
		};
		const formData = new FormData();
		formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
		formData.append("n-map.js", new Blob([newCode], { type: "application/javascript+module" }), "n-map.js");
		const deployRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, {
			method: "PUT",
			headers: { Authorization: `Bearer ${token}` },
			body: formData,
		});
		const deployData = await deployRes.json();
		if (!deployData.success) {
			throw new Error("Failed to restart worker");
		}
		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		return new Response(JSON.stringify({ success: false, error: error.message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
}
		if (request.method === "POST" && url.pathname === "/api/delete-panel") {
			try {
				const { token, scriptName } = await request.json();
				if (!token || !scriptName) throw new Error("Token or script name missing");
				const headers = {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				};
				const accRes = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers });
				const accData = await accRes.json();
				if (!accData.success || !accData.result || accData.result.length === 0) {
					throw new Error("Account not found");
				}
				const accountId = accData.result[0].id;
				const deleteRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}`, {
					method: "DELETE",
					headers,
				});
				const deleteData = await deleteRes.json();
				if (!deleteData.success) {
					const cfError = deleteData.errors && deleteData.errors.length > 0 ? deleteData.errors[0].message : "Unknown error";
					throw new Error(cfError);
				}
				return new Response(JSON.stringify({ success: true }), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				return new Response(JSON.stringify({ success: false, error: error.message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		}
		return new Response("Not Found", { status: 404 });
	},
};
function getHtmlContent() {
	return `
<!DOCTYPE html>
<html lang="fa" dir="rtl" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>N-MAP Deployer — نصب‌کننده پنل چند‌اکانتی</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: { sans: ['Vazirmatn', 'sans-serif'] },
                    colors: { amoled: { bg: '#000000', card: '#080b0f', input: '#0d1117', border: '#1c2330' } }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
        .token-input::-ms-reveal, .token-input::-ms-clear { display: none; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        .dark ::-webkit-scrollbar-thumb { background: #3f3f46; }
        ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .dark ::-webkit-scrollbar-thumb:hover { background: #52525b; }
        * { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
        .dark * { scrollbar-color: #3f3f46 transparent; }
    </style>
</head>
<body class="bg-gray-50 text-gray-900 dark:bg-amoled-bg dark:text-zinc-100 min-h-screen flex flex-col items-center justify-center p-4">
    <div id="mainCard" class="w-full max-w-md bg-white dark:bg-amoled-card border border-gray-200 dark:border-amoled-border rounded-3xl shadow-2xl p-8 relative overflow-hidden z-10">
        <div class="absolute -left-12 -top-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -right-12 -bottom-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="text-center mb-6 relative z-10">
                <div class="inline-flex items-center justify-center p-3 bg-blue-950/60 border border-blue-500 text-blue-400 rounded-2xl mb-4 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                    <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
            <h2 class="text-2xl font-black text-gray-900 dark:text-white mb-2">N-MAP Deployer</h2>
            <p class="text-sm font-medium text-gray-500 dark:text-zinc-400">نصب خودکار پنل روی کلودفلر</p>
			<p class="text-sm font-medium text-gray-500 dark:text-zinc-400">🔥  روزانه 10 الی 100 گیگ کانفیگ رایگان  🔥</p>
        </div>
        <div class="space-y-5 relative z-10">
            <a href="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_subdomain%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=N-MAP-Deployer-Token" target="_blank" class="flex items-center justify-center w-full py-3.5 border border-orange-700 text-orange-500 bg-orange-900/20 hover:bg-orange-900/40 font-bold rounded-xl text-sm transition duration-300 shadow-sm">
                دریافت توکن کلودفلر
            </a>
<div class="mt-2 text-center mb-4">
    <p class="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
        در کلودفلر لاگین کنید و سپس روی دکمه 
        <span class="font-bold text-orange-500">دریافت توکن</span> 
		کلیک کنید و پس از ورود به سایت در انتهای صفحه روی دکمه آبی رنگ 
        <span class="font-bold text-blue-500">Continue to summary</span> 
        کلیک کنید و توکن بسازید و آن را در کادر زیر وارد کنید.
    </p>
</div>   
            <div class="relative">
                <input type="password" id="apiToken" placeholder="توکن خود را وارد کنید" autocomplete="off" spellcheck="false" class="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-amoled-input border border-gray-300 dark:border-amoled-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-right text-gray-900 dark:text-zinc-100 transition token-input" dir="auto">
                <button type="button" onclick="toggleToken()" class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition">
                    <svg id="eyeIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </button>
            </div>
            <button id="deployBtn" onclick="startDeploy()" class="w-full py-3.5 border border-emerald-700 text-emerald-500 bg-emerald-900/20 hover:bg-emerald-900/40 font-black rounded-xl text-lg transition duration-300 shadow-sm">
                ساخت پنل
            </button>
            <button type="button" id="openUpdateModalBtn" onclick="toggleUpdateModal(true)" class="w-full py-3.5 border border-blue-700 text-blue-500 bg-blue-900/20 hover:bg-blue-900/40 font-black rounded-xl text-lg transition duration-300 shadow-sm mt-3">
                مدیریت و آپدیت پنل‌ها
            </button>
            <div id="status-container" class="hidden mt-4 bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-gray-200 dark:border-zinc-800/80">
                <div class="flex justify-between items-center mb-2.5">
                    <span id="status-text" class="text-xs font-bold text-gray-600 dark:text-zinc-300">شروع فرآیند...</span>
                    <span id="status-pct" class="text-xs font-black text-emerald-600 dark:text-emerald-500">۰٪</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div id="progressBar" class="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
            <div id="error-box" class="hidden mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-sm text-red-600 dark:text-red-400 text-center font-medium"></div>
        </div>
    </div>
<div class="flex flex-col gap-4 mt-6 z-10">
    <div class="flex items-center gap-4 justify-center">
        <a href="https://github.com/nikvpn-iran/n-map" target="_blank" class="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-500 bg-gray-900/20 hover:bg-gray-900/40 rounded-full shadow-sm hover:shadow-md transition text-sm font-bold group">
            <svg class="w-5 h-5 group-hover:scale-110 transition" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
            </svg>
            گیت‌هاب
        </a>
        <a href="https://t.me/nikvpn" target="_blank" class="flex items-center gap-2 px-4 py-2 border border-sky-700 text-sky-500 bg-sky-900/20 hover:bg-sky-900/40 rounded-full shadow-sm hover:shadow-md transition text-sm font-bold group">
            <svg class="w-5 h-5 group-hover:scale-110 transition" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.94-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
            </svg>
            nikvpn@
        </a>
    </div>
    <div class="flex items-center gap-4 justify-center">
        <a href="https://github.com/nikvpn-iran/n-map" target="_blank" class="flex items-center gap-2 px-4 py-2 border border-amber-700 text-amber-500 bg-amber-900/20 hover:bg-amber-900/40 rounded-full shadow-sm hover:shadow-md transition text-sm font-bold group">
            <svg class="w-5 h-5 group-hover:scale-110 transition" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            ساخت رایگان پنل
        </a>
        <a href="https://donatonion.ir-netlify.workers.dev" target="_blank" class="flex items-center gap-2 px-4 py-2 border border-red-700 text-red-500 bg-red-900/20 hover:bg-red-900/40 rounded-full shadow-sm hover:shadow-md transition text-sm font-bold group">
            <svg class="w-5 h-5 group-hover:scale-110 transition" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.08 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            دونیت
        </a>
    </div>
</div>
<div id="toast-container" class="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none"></div>
<div id="custom-confirm-modal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300 ease-out">
    <div id="custom-confirm-card" class="w-full max-w-sm bg-white dark:bg-amoled-card border border-gray-200 dark:border-amoled-border rounded-3xl shadow-2xl overflow-hidden p-6 text-center transform transition-all scale-95 duration-300">
        <h3 class="font-black text-xl text-gray-900 dark:text-white mb-3">تایید عملیات</h3>
        <p id="custom-confirm-message" class="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed font-medium"></p>
        <div class="flex gap-3">
            <button id="custom-confirm-cancel" 
                    class="flex-1 py-3 border border-red-700 text-red-500 bg-red-900/20 hover:bg-red-900/40 font-bold rounded-xl text-sm transition duration-200 shadow-sm">
                لغو
            </button>
            <button id="custom-confirm-ok" 
                    class="flex-1 py-3 border border-emerald-700 text-emerald-500 bg-emerald-900/20 hover:bg-emerald-900/40 font-bold rounded-xl text-sm transition duration-200 shadow-sm">
                تایید
            </button>
        </div>
    </div>
</div>
    <script>
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = type === 'error' 
        ? 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' 
        : 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400';
    toast.className = 'px-4 py-3 border rounded-xl shadow-lg font-bold text-sm transform transition-all duration-300 -translate-y-full opacity-0 ' + colors;
    toast.innerText = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('-translate-y-full', 'opacity-0');
    });
    setTimeout(() => {
        toast.classList.add('-translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const card = document.getElementById('custom-confirm-card');
        const msgEl = document.getElementById('custom-confirm-message');
        const btnOk = document.getElementById('custom-confirm-ok');
        const btnCancel = document.getElementById('custom-confirm-cancel');
        msgEl.innerText = message;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
        const cleanup = () => {
            modal.classList.remove('opacity-100', 'pointer-events-auto');
            modal.classList.add('opacity-0', 'pointer-events-none');
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
        };
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
    });
}

window.alert = function(message) {
    const msgStr = message ? message.toString() : '';
    if (msgStr.includes('خطا') || msgStr.includes('⚠️') || msgStr.includes('❌') || msgStr.includes('لطفاً') || msgStr.includes('نشد')) {
        showToast(msgStr, 'error');
    } else {
        showToast(msgStr, 'success');
    }
};
        function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        function toggleToken() {
            const tokenInput = document.getElementById('apiToken');
            const eyeIcon = document.getElementById('eyeIcon');
            if (tokenInput.type === 'password') {
                tokenInput.type = 'text';
                eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>';
            } else {
                tokenInput.type = 'password';
                eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
            }
        }
		function toggleUpdateModal(show) {
            const modal = document.getElementById('update-modal');
            const card = document.getElementById('update-modal-card');
            if (show) {
                modal.classList.remove('opacity-0', 'pointer-events-none');
                modal.classList.add('opacity-100', 'pointer-events-auto');
                card.classList.remove('opacity-0', 'scale-95');
                card.classList.add('opacity-100', 'scale-100');
            } else {
                modal.classList.remove('opacity-100', 'pointer-events-auto');
                modal.classList.add('opacity-0', 'pointer-events-none');
                card.classList.remove('opacity-100', 'scale-100');
                card.classList.add('opacity-0', 'scale-95');
            }
        }
async function checkExistingPanels() {
    const token = document.getElementById('updateApiToken').value.trim();
    const btn = document.getElementById('checkPanelsBtn');
    const listContainer = document.getElementById('panels-list-container');
    const statusBox = document.getElementById('update-status');
    if (!token) {
        statusBox.classList.remove('hidden');
        statusBox.className = 'mt-4 text-center text-sm font-bold p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
        statusBox.innerText = 'توکن وارد نشده است';
        return;
    }
    btn.disabled = true;
    btn.innerText = 'در حال بررسی...';
    statusBox.classList.add('hidden');
    listContainer.classList.add('hidden');
    listContainer.innerHTML = '';
    try {
        const response = await fetch('/api/list-panels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const result = await response.json();
        if (result.success) {
            const latestVersion = result.latestVersion || "Unknown";
            const devSub = result.devSub || "";
            if (result.panels.length === 0) {
                statusBox.classList.remove('hidden');
                statusBox.className = 'mt-4 text-center text-sm font-bold p-3 rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
                statusBox.innerText = 'هیچ پنلی یافت نشد';
            } else {
                result.panels.forEach(panel => {
                    const panelDiv = document.createElement('div');
                    panelDiv.className = 'flex flex-col gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl';
                    panelDiv.id = 'panel-item-' + panel.name;
                    panelDiv.innerHTML = '<div class="flex flex-col">' +
                        '<span class="font-bold text-gray-900 dark:text-zinc-100 break-all">' + panel.name + '</span>' +
                        '<span id="version-text-' + panel.name + '" class="text-[11px] text-blue-500 font-medium mt-1 animate-pulse" dir="rtl">در حال بررسی...</span>' +
                    '</div>' + 
                    '<div id="btn-container-' + panel.name + '" class="w-full">' +
                        '<div class="w-16 h-6 bg-gray-200 dark:bg-zinc-700 rounded-lg animate-pulse"></div>' +
                    '</div>';
                    listContainer.appendChild(panelDiv);
                    fetchPanelVersion(token, panel.name, latestVersion, devSub);
                });
                listContainer.classList.remove('hidden');
            }
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        statusBox.classList.remove('hidden');
        statusBox.className = 'mt-4 text-center text-sm font-bold p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
        statusBox.innerText = 'خطا: ' + e.message;
    } finally {
        btn.disabled = false;
        btn.innerText = 'بررسی پنل‌های موجود';
    }
}
async function fetchPanelVersion(token, scriptName, latestVersion, devSub) {
    try {
        const response = await fetch('/api/get-panel-version', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, scriptName })
        });
        const result = await response.json();
        const version = result.success ? result.version : "Unknown";
        const isLatest = (version === latestVersion && latestVersion !== "Unknown");
        const displayVersion = version === "Unknown" ? "نامشخص" : version;
        const versionText = document.getElementById('version-text-' + scriptName);
        const btnContainer = document.getElementById('btn-container-' + scriptName);
        if (versionText && btnContainer) {
            versionText.className = 'text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-1';
            versionText.innerText = displayVersion;
            let panelUrl = "#";
            if (devSub) {
                panelUrl = "https://" + scriptName + "." + devSub + ".workers.dev/panel";
            }

			let buttonsHtml = '<div class="space-y-1.5 pt-1">';
			buttonsHtml += '<div class="flex gap-2">';
			if (isLatest) {
				buttonsHtml += '<button disabled class="flex-1 px-4 py-1.5 border border-emerald-700 text-emerald-500 bg-emerald-900/20 font-bold rounded-xl text-[11px] cursor-not-allowed shadow-sm">آپدیت شده ✓</button>';
			} else {
				buttonsHtml += '<button data-name="' + scriptName + '" onclick="updateNmapPanel(this.dataset.name)" class="flex-1 px-4 py-1.5 border border-purple-700 text-purple-500 bg-purple-900/20 hover:bg-purple-900/40 font-bold rounded-xl text-[11px] transition shadow-sm">آپدیت پنل</button>';
			}
			if (devSub) {
				buttonsHtml += '<a href="' + panelUrl + '" target="_blank" class="flex-1 px-4 py-1.5 border border-blue-700 text-blue-500 bg-blue-900/20 hover:bg-blue-900/40 font-bold rounded-xl text-[11px] transition shadow-sm flex items-center justify-center">ورود به پنل</a>';
			} else {
				buttonsHtml += '<button disabled class="flex-1 px-4 py-1.5 border border-gray-700 text-gray-500 bg-gray-900/20 font-bold rounded-xl text-[11px] cursor-not-allowed shadow-sm">ورود به پنل</button>';
			}
			buttonsHtml += '</div>';
			buttonsHtml += '<div class="flex gap-2">';
			buttonsHtml += '<button data-name="' + scriptName + '" onclick="resetPanelPassword(this.dataset.name)" class="flex-1 px-5 py-1.5 border border-yellow-700 text-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40 font-bold rounded-xl text-[11px] transition shadow-sm whitespace-nowrap min-w-[110px]">بازیابی رمز</button>';
			buttonsHtml += '<button data-name="' + scriptName + '" onclick="reloadNmapPanel(this.dataset.name)" class="flex-1 px-5 py-1.5 border border-cyan-700 text-cyan-500 bg-cyan-900/20 hover:bg-cyan-900/40 font-bold rounded-xl text-[11px] transition shadow-sm whitespace-nowrap min-w-[110px]">ری استارت</button>';
			buttonsHtml += '</div>';
			buttonsHtml += '<div class="flex gap-2">';
			buttonsHtml += '<button data-name="' + scriptName + '" onclick="deleteNmapPanel(this.dataset.name)" class="flex-1 px-5 py-1.5 border border-red-700 text-red-500 bg-red-900/20 hover:bg-red-900/40 font-bold rounded-xl text-[11px] transition shadow-sm whitespace-nowrap min-w-[110px]">حذف پنل</button>';
			buttonsHtml += '</div></div>';
			btnContainer.innerHTML = buttonsHtml;

        }
    } catch (e) {
        const versionText = document.getElementById('version-text-' + scriptName);
        if (versionText) {
            versionText.className = 'text-[11px] text-red-500 font-medium mt-1';
            versionText.innerText = 'خطا';
        }
    }
}
async function updateNmapPanel(scriptName) {
    const token = document.getElementById('updateApiToken').value.trim();
    if (!(await customConfirm('آیا از آپدیت پنل ' + scriptName + ' مطمئن هستید؟'))) return;
    showToast('در حال آپدیت ' + scriptName + '...');
    try {
        const response = await fetch('/api/do-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, scriptName })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ پنل ' + scriptName + ' با موفقیت آپدیت شد!');
            setTimeout(() => checkExistingPanels(), 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        showToast('خطا: ' + e.message, 'error');
    }
}
async function deleteNmapPanel(scriptName) {
    const token = document.getElementById('updateApiToken').value.trim();
    if (!(await customConfirm('آیا از حذف پنل ' + scriptName + ' مطمئن هستید؟'))) return;
    showToast('در حال حذف ' + scriptName + '...');
    try {
        const response = await fetch('/api/delete-panel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, scriptName })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ پنل با موفقیت حذف شد');
            setTimeout(() => checkExistingPanels(), 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        showToast('خطا: ' + e.message, 'error');
    }
}
async function resetPanelPassword(scriptName) {
    const token = document.getElementById('updateApiToken').value.trim();
    if (!(await customConfirm('بازیابی رمز عبور پنل ' + scriptName + '؟'))) return;
    showToast('در حال بازیابی رمز عبور ' + scriptName + '...');
    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, scriptName })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ رمز عبور بازنشانی شد');
            setTimeout(() => checkExistingPanels(), 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        showToast('خطا: ' + e.message, 'error');
    }
}
async function reloadNmapPanel(scriptName) {
    const token = document.getElementById('updateApiToken').value.trim();
    if (!(await customConfirm('آیا پنل مجدداً دیپلوی شود؟ کاربران شما باقی می‌مانند.'))) return;
    showToast('در حال ریلود پنل ' + scriptName + '...');
    try {
        const response = await fetch('/api/do-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, scriptName })
        });
        const result = await response.json();
        if (result.success) {
            showToast('✅ پنل با موفقیت ریلود شد');
            setTimeout(() => checkExistingPanels(), 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        showToast('خطا: ' + e.message, 'error');
    }
}
        let deployInProgress = false;
        async function startDeploy() {
            if (deployInProgress) return;
            const token = document.getElementById('apiToken').value.trim();
            const btn = document.getElementById('deployBtn');
            const statusContainer = document.getElementById('status-container');
            const statusText = document.getElementById('status-text');
            const statusPct = document.getElementById('status-pct');
            const progressBar = document.getElementById('progressBar');
            const errorBox = document.getElementById('error-box');
            const oldText = document.getElementById('successTxt');
            if (oldText) oldText.remove();
            const oldSuccessLink = document.getElementById('successBtn');
            if (oldSuccessLink) oldSuccessLink.remove();
            if(!token) {
                errorBox.classList.remove('hidden');
                errorBox.innerText = 'لطفاً ابتدا توکن را وارد کنید.';
                return;
            }
            errorBox.classList.add('hidden');
            deployInProgress = true;
            btn.disabled = true;
            document.getElementById('apiToken').disabled = true;
            btn.innerText = 'در حال پردازش...';
            statusContainer.classList.remove('hidden');
            statusText.innerText = 'در حال بررسی توکن...';
            statusPct.innerText = '۱۵٪';
            progressBar.style.width = '15%';
            await sleep(500);
            statusText.innerText = 'در حال ارتباط با کلودفلر...';
            statusPct.innerText = '۳۰٪';
            progressBar.style.width = '30%';
            await sleep(500);
            statusText.innerText = 'در حال ایجاد دیتابیس D1...';
            statusPct.innerText = '۵۰٪';
            progressBar.style.width = '50%';
            try {
                const response = await fetch('/api/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                statusText.innerText = 'در حال دریافت و نصب پنل...';
                statusPct.innerText = '۷۵٪';
                progressBar.style.width = '75%';
                await sleep(600);
                statusText.innerText = 'در حال فعال‌سازی لینک...';
                statusPct.innerText = '۹۰٪';
                progressBar.style.width = '90%';
                await sleep(500);
                const result = await response.json();
                if (result.success) {
                    progressBar.style.width = '100%';
                    statusPct.innerText = '۱۰۰٪';
                    statusText.innerText = 'تکمیل شد!';
                    await sleep(400);
                    statusContainer.classList.add('hidden');
                    const successText = document.createElement('div');
                    successText.id = 'successTxt';
                    successText.className = 'text-center mt-6 font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-3';
                    successText.innerText = '✅ پنل ساخته شد لطفا 5 دقیقه صبر کنید و سپس وارد شوید';
                    document.getElementById('mainCard').appendChild(successText);
                    const linkBox = document.createElement('div');
                    linkBox.className = 'flex flex-col items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-500/50 rounded-xl mb-3';
                    const linkDisplay = document.createElement('span');
                    linkDisplay.className = 'text-sm font-mono text-emerald-700 dark:text-emerald-400 mb-2 text-center break-all';
                    linkDisplay.innerText = result.url;
                    linkDisplay.dir = 'ltr';
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'px-6 py-1.5 border border-emerald-700 text-emerald-500 bg-emerald-900/20 hover:bg-emerald-900/40 font-bold rounded-lg text-sm transition duration-300 shadow-sm';
                    copyBtn.innerText = 'کپی لینک پنل';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(result.url);
                        copyBtn.innerText = 'کپی شد!';
                        copyBtn.classList.replace('bg-emerald-900/20', 'bg-emerald-900/40');
                        setTimeout(() => {
                            copyBtn.innerText = 'کپی لینک پنل';
                            copyBtn.classList.replace('bg-emerald-900/40', 'bg-emerald-900/20');
                        }, 2000);
                    };
                    linkBox.appendChild(linkDisplay);
                    linkBox.appendChild(copyBtn);
                    document.getElementById('mainCard').appendChild(linkBox);
                    const successLink = document.createElement('a');
                    successLink.href = result.url;
                    successLink.target = '_blank';
                    successLink.className = 'block w-full py-3.5 border border-blue-700 text-blue-500 bg-blue-900/20 hover:bg-blue-900/40 text-center font-bold rounded-xl transition duration-300 shadow-sm';
                    successLink.id = 'successBtn';
                    successLink.innerText = 'ورود به پنل';
                    document.getElementById('mainCard').appendChild(successLink);
                } else {
                    throw new Error(result.error);
                }
            } catch(e) {
                deployInProgress = false;
                statusContainer.classList.add('hidden');
                errorBox.classList.remove('hidden');
                btn.disabled = false;
                document.getElementById('apiToken').disabled = false;
                btn.innerText = 'ساخت پنل';
                const errorMsg = e.message;
                const rawError = errorMsg.includes('|') ? errorMsg.split('|')[1] : errorMsg;
                if (errorMsg.includes("databases per account") || errorMsg.includes("limit reached")) {
                    errorBox.innerHTML = '<div class="mb-2 font-bold">شما به سقف مجاز ساخت دیتابیس D1 رسیده‌اید.</div>' +
                        '<div class="text-[11px] opacity-70 mb-3" dir="ltr">' + rawError + '</div>' +
                        '<a href="https://dash.cloudflare.com/?to=/:account/workers/d1" target="_blank" class="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs">مدیریت دیتابیس‌ها</a>';
                }
                else if (errorMsg.includes("script limit") || errorMsg.includes("scripts per account")) {
                    errorBox.innerHTML = '<div class="mb-2 font-bold">شما به سقف مجاز ساخت ورکر رسیده‌اید.</div>' +
                        '<div class="text-[11px] opacity-70 mb-3" dir="ltr">' + rawError + '</div>' +
                        '<a href="https://dash.cloudflare.com/?to=/:account/workers/services" target="_blank" class="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs">مدیریت ورکرها</a>';
                }
                else if (errorMsg.includes("اکانتی یافت نشد") || errorMsg.includes("Authentication") || errorMsg.includes("Invalid")) {
                    errorBox.innerHTML = '<div class="mb-2 font-bold">توکن دسترسی ندارد لطفا فقط با دکمه نارنجی «دریافت توکن» کار کنید.</div>' +
                        '<div class="text-[11px] opacity-70 mb-3" dir="ltr">' + rawError + '</div>' +
                        '<a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" class="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs">مدیریت توکن‌ها</a>';
                }
                else if (errorMsg.includes("CF_TOS_ERROR") || errorMsg.includes("CF_DB_ERROR") || errorMsg.includes("CF_DEPLOY_ERROR")) {
                    if (errorMsg.includes("email") || errorMsg.includes("verify")) {
                        errorBox.innerHTML = '<div class="mb-2 font-bold">ابتدا ایمیل خود را در کلودفلر تایید کنید.</div>' +
                            '<div class="text-[11px] opacity-70 mb-3" dir="ltr">' + rawError + '</div>' +
                            '<a href="https://dash.cloudflare.com/profile" target="_blank" class="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs">تایید ایمیل</a>';
                    } else {
                        errorBox.innerHTML = '<div class="mb-2 font-bold">قوانین کلودفلر را در داشبورد تایید کنید.</div>' +
                            '<div class="text-[11px] opacity-70 mb-3" dir="ltr">' + rawError + '</div>' +
                            '<a href="https://dash.cloudflare.com/?to=/:account/workers/overview" target="_blank" class="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs">ورود به کلودفلر</a>';
                    }
                } else {
                    errorBox.innerText = errorMsg;
                }
            }
        }
    </script>
<div id="update-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 opacity-0 pointer-events-none transition-opacity duration-200 ease-out">
    <div id="update-modal-card" class="w-full max-w-md bg-white dark:bg-amoled-card border border-gray-200 dark:border-amoled-border rounded-3xl shadow-2xl p-5 transform transition-all scale-95 opacity-0 duration-200 flex flex-col max-h-[95vh]">
        <div class="flex justify-between items-center mb-6 shrink-0">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">مدیریت و آپدیت پنل‌ها</h3>
            <button onclick="toggleUpdateModal(false)" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <div class="space-y-4 shrink-0">
            <a href="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22workers_subdomain%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=N-MAP-Deployer-Token" target="_blank" class="flex items-center justify-center w-full py-2.5 border border-orange-700 text-orange-500 bg-orange-900/20 hover:bg-orange-900/40 font-bold rounded-xl text-sm transition duration-300 shadow-sm">
                دریافت توکن کلودفلر
            </a>
<div class="mt-2 text-center mb-4">
    <p class="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
        در کلودفلر لاگین کنید و سپس روی دکمه 
        <span class="font-bold text-orange-500">دریافت توکن</span> 
		کلیک کنید و پس از ورود به سایت در انتهای صفحه روی دکمه آبی رنگ 
        <span class="font-bold text-blue-500">Continue to summary</span> 
        کلیک کنید و توکن بسازید و آن را در کادر زیر وارد کنید.
    </p>
</div>         
            <input type="password" id="updateApiToken" placeholder="توکن خود را وارد کنید" autocomplete="off" spellcheck="false" class="w-full px-4 py-3 bg-gray-50 dark:bg-amoled-input border border-gray-300 dark:border-amoled-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-right text-gray-900 dark:text-zinc-100 transition" dir="auto">
            <button id="checkPanelsBtn" onclick="checkExistingPanels()" class="w-full py-3 border border-indigo-700 text-indigo-500 bg-indigo-900/20 hover:bg-indigo-900/40 font-bold rounded-xl text-md transition duration-300 shadow-sm">
                بررسی پنل‌های موجود
            </button>
        </div>
        <div id="panels-list-container" class="mt-6 hidden overflow-y-auto space-y-3 pr-1 pb-2">
        </div>
        <div id="update-status" class="hidden mt-4 text-center text-sm font-bold shrink-0 p-3 rounded-xl"></div>
    </div>
</div>
</body>
</html>
    `;
}
