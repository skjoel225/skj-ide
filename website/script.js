document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-btn');
  const versionInfo = document.getElementById('version-info');
  
  // Basic OS detection
  const userAgent = window.navigator.userAgent.toLowerCase();
  let os = 'Unknown';
  
  if (userAgent.indexOf('win') !== -1) os = 'Windows';
  else if (userAgent.indexOf('mac') !== -1) os = 'MacOS';
  else if (userAgent.indexOf('linux') !== -1) os = 'Linux';
  
  if (os === 'Windows') {
    downloadBtn.querySelector('.text').textContent = 'Télécharger pour Windows';
    versionInfo.textContent = 'Version 1.2.3 • Windows 10/11';
    downloadBtn.href = 'https://github.com/skjoel225/skj-ide/releases/download/v1.2.3/SKJ-IDE-Setup-1.2.3.exe';
  } else {
    downloadBtn.querySelector('.text').textContent = `Télécharger pour Windows`;
    versionInfo.textContent = `Version 1.2.3 • Vous semblez être sur ${os}, mais seul Windows est supporté pour le moment.`;
    downloadBtn.href = 'https://github.com/skjoel225/skj-ide/releases/download/v1.2.3/SKJ-IDE-Setup-1.2.3.exe';
  }

  // Simulate download click
  downloadBtn.addEventListener('click', (e) => {
    // We let the default href behavior happen (downloading the file)
    console.log('Downloading SKJ IDE...');
    
    // Optional: show a toast or message
    const originalText = downloadBtn.querySelector('.text').textContent;
    downloadBtn.querySelector('.text').textContent = 'Téléchargement en cours...';
    setTimeout(() => {
      downloadBtn.querySelector('.text').textContent = originalText;
    }, 3000);
  });
});
