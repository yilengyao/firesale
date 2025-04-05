const { ipcRenderer, IpcMainEvent, IpcRendererEvent, shell } = require('electron');
const { marked } = require('marked');
const path = require('node:path');

const markdownView = document.getElementById('markdown') as HTMLTextAreaElement;
const htmlView = document.getElementById('html') as HTMLDivElement;
const newFileButton = document.getElementById('new-file') as HTMLButtonElement;
const openFileButton = document.getElementById('open-file') as HTMLButtonElement;
const saveMarkdownButton = document.getElementById('save-markdown') as HTMLButtonElement;
const revertButton = document.getElementById('revert') as HTMLButtonElement;
const saveHtmlButton = document.getElementById('save-html') as HTMLButtonElement;
const showFileButton = document.getElementById('show-file') as HTMLButtonElement;
const openInDefaultButton = document.getElementById('open-in-default') as HTMLButtonElement;

let filePath: string | null = null;
let originalContent: string = '';

const renderMarkdownToHtml = (markdown: string): void => {
    htmlView.innerHTML = marked(markdown, { sanitize: true});
};

ipcRenderer.on('render-markdown-html', () => {
    const content = markdownView.value;
    renderMarkdownToHtml(content);
})

const renderFile = (file: string, content: string): void => {
    filePath = file;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);

    showFileButton.disabled = false;
    openInDefaultButton.disabled = false;

    updateUserInterface(false);
};

const updateUserInterface = (isEdited: boolean): void => {
    let title: string = 'Fire Sale';

    if (filePath) { 
        title = `${path.basename(filePath)} - ${title}`;
    }
    if (isEdited) {
        title = `${title} (Edited)`;
    }

    ipcRenderer.send('update-title', title);
    ipcRenderer.send('update-document', isEdited);

    saveMarkdownButton.disabled = !isEdited;
    revertButton.disabled = !isEdited;
}

markdownView.addEventListener('keyup', (event: Event) => {
    event.preventDefault();
    
    const currentContent = (event.target as HTMLTextAreaElement).value;
    renderMarkdownToHtml(currentContent);
    updateUserInterface(currentContent !== originalContent);
})

markdownView.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    ipcRenderer.send('show-context-menu');
});

newFileButton.addEventListener('click', () => {
    // Invokes createWindow in main process
    ipcRenderer.send('create-window');
});

openFileButton.addEventListener('click', () => {
    ipcRenderer.send('get-file-from-user');
});

saveMarkdownButton.addEventListener('click', () => {
    ipcRenderer.send('save-markdown', filePath, markdownView.value);
    originalContent = markdownView.value;
})

revertButton.addEventListener('click', () => {
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
})

saveHtmlButton.addEventListener('click', () => {
    ipcRenderer.send('save-html', htmlView.innerHTML);
});

const showFile = () => {
    if (!filePath) {
        return alert('This file has not been saved in the filesystem.');
    }
    shell.showItemInFolder(filePath);
}

const openInDefaultApplication = () => {
    if (!filePath) {
        return alert('This file has not been saved to the filesystem.');
    }
    shell.openPath(filePath);
}

showFileButton.addEventListener('click', showFile);
openInDefaultButton.addEventListener('click', openInDefaultApplication);

ipcRenderer.on('file-opened', async (event: typeof IpcRendererEvent, file: string, content: string) => {
    if (markdownView.value !== originalContent && originalContent !== content) {
        const result = await ipcRenderer.send(
            'show-dialog-message', 
            'warning',
            'Overwrite Current Unsaved Changes?',
            'Opening a new file in this window will overwrite your current unsaved changes. Open this file anyway?',
            ['Yes', 'No'],
            0,
            1);
            
            // If user cancelled, don't open the file
            if (!result) {
                return;
            }
    }    

    renderFile(file, content);
});

ipcRenderer.on('file-changed', (event: typeof IpcRendererEvent, file: string, content: string) => {
    if (originalContent !== content) {
        ipcRenderer.send(
            'show-dialog-message',
            'warning',
            'Overwrite Current Unsaved Changes?',
            'Another application has changed thsi file. Load changes?',
            ['Yes', 'No'],
            0,
            1);
    }

    renderFile(file, content);
});

/* Implement Drag and Drop */
document.addEventListener('dragstart', (event: DragEvent) => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());


const getDraggedFile = (event: DragEvent) => {
    return event.dataTransfer?.items[0]?.kind === 'file' 
        ? event.dataTransfer.items[0].getAsFile() 
        : null;
};

const getDroppedFile = (event: DragEvent): File | null => {
    return event.dataTransfer?.files[0] || null;
};

const fileTypeIsSupported = (file: File): boolean => {
    return ['text/plain', 'text/markdown'].includes(file.type);
}

markdownView.addEventListener('dragover', (event: DragEvent) => {
    event.preventDefault();

    const file = getDraggedFile(event);
    if (file && fileTypeIsSupported(file)) {
        markdownView.classList.add('drag-over');
    } else {
        markdownView.classList.add('drag-error');
    }
});

markdownView.addEventListener('dragleave', () => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});
  
markdownView.addEventListener('drop', (event: DragEvent) => {
    event.preventDefault();
    const file = getDroppedFile(event);
    if (file && fileTypeIsSupported(file)) {
        const reader = new FileReader();

        reader.onload = () => {
            const content = reader.result as string;
            renderFile(file.path, content);
        };

        reader.readAsText(file);
    } else {
      alert('That file type is not supported');
    }
  
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

ipcRenderer.on('save-markdown', () => {
    ipcRenderer.send('save-markdown', filePath, markdownView.value);
})

ipcRenderer.on('save-html', () => {
    ipcRenderer.send('save-html', htmlView.innerHTML);
});