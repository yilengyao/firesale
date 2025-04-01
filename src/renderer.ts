const { ipcRenderer, IpcMainEvent, IpcRendererEvent } = require('electron');
const {marked} = require('marked');

const markdownView = document.getElementById('markdown') as HTMLTextAreaElement;
const htmlView = document.getElementById('html') as HTMLDivElement;
const newFileButton = document.getElementById('new-file') as HTMLButtonElement;
const openFileButton = document.getElementById('open-file') as HTMLButtonElement;
const saveMarkdownButton = document.getElementById('save-markdown') as HTMLButtonElement;
const revertButton = document.getElementById('revert') as HTMLButtonElement;
const saveHtmlButton = document.getElementById('save-html') as HTMLButtonElement;
const showFileButton = document.getElementById('show-file') as HTMLButtonElement;
const openInDefaultButton = document.getElementById('open-in-default') as HTMLButtonElement;

const renderMarkdownToHtml = (markdown: string): void => {
    htmlView.innerHTML = marked(markdown, { sanitize: true});
};

markdownView.addEventListener('keyup', (event: Event) => {
    event.preventDefault();
    
    const currentContent = (event.target as HTMLTextAreaElement).value;
    renderMarkdownToHtml(currentContent);
})

openFileButton.addEventListener('click', () => {
    console.log('Open file button clicked');
    ipcRenderer.send('get-file-from-user');
});

ipcRenderer.on('file-opened', (event: typeof IpcRendererEvent, file: string, content: string) => {
    markdownView.value = content;
    renderMarkdownToHtml(content);
});