const CONFIG = {
  owner: 'ayano-yuki',
  repo: 'gslide-template-store',
  branch: 'main',
  templates: {
    'template-a': {
      slidesId: 'SLIDES_ID_A',
      repoDir: 'templates/template-a'
    },
    'template-b': {
      slidesId: 'SLIDES_ID_B',
      repoDir: 'templates/template-b'
    }
  }
};

function onOpen() {
  SlidesApp.getUi()
    .createMenu('Template Release')
    .addItem('Release template', 'releaseTemplate')
    .addToUi();
}

function releaseTemplate() {
  const ui = SlidesApp.getUi();

  const templateName = promptText(
    ui,
    'Template name',
    Object.keys(CONFIG.templates).join(', ')
  );

  if (!templateName) return;

  const template = CONFIG.templates[templateName];
  if (!template) {
    ui.alert(`Invalid template: ${templateName}`);
    return;
  }

  const version = promptText(ui, 'Version', 'v1.2.0');
  if (!version) return;

  if (!/^v\\d+\\.\\d+\\.\\d+$/.test(version)) {
    ui.alert('Version must be like v1.2.0');
    return;
  }

  const token = PropertiesService
    .getScriptProperties()
    .getProperty('GITHUB_TOKEN');

  const pptx = exportSlides(template.slidesId, 'pptx');
  const pdf = exportSlides(template.slidesId, 'pdf');

  const baseName = `${templateName}_${version}`;

  putGitHubFile({
    path: `${template.repoDir}/${baseName}.pptx`,
    bytes: pptx,
    message: `release: ${templateName} ${version} pptx`,
    token
  });

  putGitHubFile({
    path: `${template.repoDir}/${baseName}.pdf`,
    bytes: pdf,
    message: `release: ${templateName} ${version} pdf`,
    token
  });

  putGitHubFile({
    path: `${template.repoDir}/latest.pptx`,
    bytes: pptx,
    message: `chore: update ${templateName} latest pptx`,
    token
  });

  putGitHubFile({
    path: `${template.repoDir}/latest.pdf`,
    bytes: pdf,
    message: `chore: update ${templateName} latest pdf`,
    token
  });

  ui.alert(`Released ${templateName} ${version}`);
}

function promptText(ui, title, message) {
  const result = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return null;
  return result.getResponseText().trim();
}

function exportSlides(slidesId, format) {
  const url = `https://docs.google.com/presentation/d/${slidesId}/export/${format}`;

  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    }
  });

  return response.getBlob().getBytes();
}
