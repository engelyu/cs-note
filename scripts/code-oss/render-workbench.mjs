function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderWorkbench({ template, base, extensionUri, folderUri }) {
  const configuration = {
    folderUri,
    productConfiguration: { nameShort: "Algor Note", nameLong: "Algor Note" },
    additionalBuiltinExtensions: [{ scheme: "https", authority: "static", path: extensionUri }],
  };
  const encoded = escapeHtmlAttribute(JSON.stringify(configuration));
  return template.replaceAll("{{WORKBENCH_WEB_CONFIGURATION}}", encoded)
    .replaceAll("{{WORKBENCH_WEB_BASE_URL}}", base)
    .replaceAll("{{WORKBENCH_BUILTIN_EXTENSIONS}}", "[]")
    .replaceAll("{{WORKBENCH_MAIN}}", `<script src="${base}/out/vs/workbench/workbench.web.main.js"></script>`);
}
