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

  if (!/^v\d+\.\d+\.\d+$/.test(version)) {
    ui.alert('Version must be like v1.2.0');
    return;
  }

  const token = PropertiesService
    .getScriptProperties()
    .getProperty('GITHUB_TOKEN');

  if (!token) {
    ui.alert('Missing script property: GITHUB_TOKEN');
    return;
  }

  const baseName = `${templateName}_${version}`;
  const versionedPptxPath = `${template.repoDir}/${baseName}.pptx`;
  const versionedPdfPath = `${template.repoDir}/${baseName}.pdf`;
  const latestPptxPath = `${template.repoDir}/latest.pptx`;
  const latestPdfPath = `${template.repoDir}/latest.pdf`;

  try {
    assertGitHubFileDoesNotExist({
      path: versionedPptxPath,
      token
    });

    assertGitHubFileDoesNotExist({
      path: versionedPdfPath,
      token
    });

    const pptx = exportSlides(template.slidesId, 'pptx');
    const pdf = exportSlides(template.slidesId, 'pdf');

    putGitHubFile({
      path: versionedPptxPath,
      bytes: pptx,
      message: `release: ${templateName} ${version} pptx`,
      token,
      overwrite: CONFIG.release.versionedOverwrite
    });

    putGitHubFile({
      path: versionedPdfPath,
      bytes: pdf,
      message: `release: ${templateName} ${version} pdf`,
      token,
      overwrite: CONFIG.release.versionedOverwrite
    });

    putGitHubFile({
      path: latestPptxPath,
      bytes: pptx,
      message: `chore: update ${templateName} latest pptx`,
      token,
      overwrite: CONFIG.release.latestOverwrite
    });

    putGitHubFile({
      path: latestPdfPath,
      bytes: pdf,
      message: `chore: update ${templateName} latest pdf`,
      token,
      overwrite: CONFIG.release.latestOverwrite
    });

    ui.alert(`Released ${templateName} ${version}`);
  } catch (error) {
    ui.alert(`Release failed: ${error.message || error}`);
    throw error;
  }
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

function putGitHubFile({ path, bytes, message, token, overwrite }) {
  const sha = getExistingGitHubFileSha({
    path,
    token
  });

  if (sha && !overwrite) {
    throw new Error(`Refusing to overwrite immutable release artifact: ${path}`);
  }

  const payload = {
    message,
    content: Utilities.base64Encode(bytes),
    branch: CONFIG.github.branch
  };

  if (sha) {
    payload.sha = sha;
  }

  const response = UrlFetchApp.fetch(gitHubContentsUrl(path), {
    method: 'put',
    contentType: 'application/json',
    headers: gitHubHeaders(token),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status !== 200 && status !== 201) {
    throw new Error(`GitHub upload failed (${status}) for ${path}: ${response.getContentText()}`);
  }
}

function getExistingGitHubFileSha({ path, token }) {
  const response = UrlFetchApp.fetch(`${gitHubContentsUrl(path)}?ref=${encodeURIComponent(CONFIG.github.branch)}`, {
    method: 'get',
    headers: gitHubHeaders(token),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status === 404) {
    return null;
  }

  if (status !== 200) {
    throw new Error(`GitHub file lookup failed (${status}) for ${path}: ${response.getContentText()}`);
  }

  const body = JSON.parse(response.getContentText());
  if (!body.sha) {
    throw new Error(`GitHub file lookup did not return a sha for ${path}`);
  }

  return body.sha;
}

function assertGitHubFileDoesNotExist({ path, token }) {
  const sha = getExistingGitHubFileSha({
    path,
    token
  });

  if (sha) {
    throw new Error(`Versioned release artifact already exists: ${path}`);
  }
}

function gitHubContentsUrl(path) {
  return `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${encodeGitHubPath(path)}`;
}

function encodeGitHubPath(path) {
  return path
    .split('/')
    .map(encodeURIComponent)
    .join('/');
}

function gitHubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}
