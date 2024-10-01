pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

let pdfDoc = null;
let pageScale = 1;
const maxPageSize = 2 * 96; 
const padding = 2; 
const minSquareSize = 20; 


const fileInput = document.getElementById('file-input');
const pdfViewer = document.getElementById('pdf-viewer');
const pageCheckboxes = document.getElementById('page-checkboxes');
const squareColorSelect = document.getElementById('square-color');
const pageControls = document.getElementById('page-controls');
const selectAllCheckbox = document.getElementById('select-all');
const selectMiddleCheckbox = document.getElementById('select-middle');

fileInput.addEventListener('change', loadPDF);
selectAllCheckbox.addEventListener('change', handleBulkSelection);
selectMiddleCheckbox.addEventListener('change', handleBulkSelection);

function loadPDF(event) {
    const file = event.target.files[0];
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            pdfDoc = pdf;
            renderPages();
            pageControls.classList.remove('hidden');
        });
    };
    fileReader.readAsArrayBuffer(file);
}

function renderPages() {
    pdfViewer.innerHTML = '';
    pageCheckboxes.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        pdfDoc.getPage(pageNum).then(function(page) {
            const viewport = page.getViewport({ scale: 1 });
            pageScale = Math.min(maxPageSize / viewport.width, maxPageSize / viewport.height);
            const scaledViewport = page.getViewport({ scale: pageScale });

            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page';
            pdfViewer.appendChild(pageContainer);

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            pageContainer.appendChild(canvas);

            const pageNumber = document.createElement('div');
            pageNumber.className = 'page-number';
            pageNumber.textContent = `Page ${pageNum}`;
            pageContainer.appendChild(pageNumber);

            page.render({
                canvasContext: context,
                viewport: scaledViewport
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `page-${pageNum}`;
            checkbox.dataset.pageNum = pageNum;
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    addSquare(pageContainer);
                } else {
                    removeSquare(pageContainer);
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `page-${pageNum}`;
            label.textContent = `Page ${pageNum}`;

            const checkboxContainer = document.createElement('div');
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            pageCheckboxes.appendChild(checkboxContainer);
        });
    }
}
pageCheckboxes.addEventListener('change', function(event) {
    if (event.target.type === 'checkbox' && event.target.dataset.pageNum) {
        toggleSquare(event.target);
        updateBulkSelectionState();
    }
});

function handleBulkSelection(event) {
    const checkboxes = document.querySelectorAll('#page-checkboxes input[type="checkbox"]');
    const totalPages = checkboxes.length;

    if (event.target.id === 'select-all') {
        checkboxes.forEach(checkbox => {
            checkbox.checked = event.target.checked;
            toggleSquare(checkbox);
        });
        selectMiddleCheckbox.checked = false;
    } else if (event.target.id === 'select-middle') {
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = event.target.checked && index !== 0 && index !== totalPages - 1;
            toggleSquare(checkbox);
        });
        selectAllCheckbox.checked = false;
    }
    updateBulkSelectionState();
}

function updateBulkSelectionState() {
    const checkboxes = Array.from(document.querySelectorAll('#page-checkboxes input[type="checkbox"]'));
    const totalPages = checkboxes.length;
    const checkedPages = checkboxes.filter(cb => cb.checked);
    const middlePages = checkboxes.slice(1, -1);

    selectAllCheckbox.checked = checkedPages.length === totalPages;
    selectMiddleCheckbox.checked = middlePages.every(cb => cb.checked) && !checkboxes[0].checked && !checkboxes[totalPages - 1].checked;
}

function toggleSquare(checkbox) {
    const pageContainer = document.querySelector(`.pdf-page:nth-child(${checkbox.dataset.pageNum})`);
    if (checkbox.checked) {
        addSquare(pageContainer);
    } else {
        removeSquare(pageContainer);
    }
}

function addSquare(pageContainer) {
    removeSquare(pageContainer);
    const square = document.createElement('div');
    square.className = 'square';
    square.style.width = '50px';
    square.style.height = '50px';
    square.style.backgroundColor = squareColorSelect.value;
    
    
    square.style.left = `${(pageContainer.offsetWidth - 50) / 2}px`;
    square.style.top = `${(pageContainer.offsetHeight - 50) / 2}px`;
    
    pageContainer.appendChild(square);

    const resizer = document.createElement('div');
    resizer.className = 'square-resizer';
    square.appendChild(resizer);

    makeResizableAndDraggable(square, resizer, pageContainer);
}


function removeSquare(pageContainer) {
    const square = pageContainer.querySelector('.square');
    if (square) {
        pageContainer.removeChild(square);
    }
}

function makeResizableAndDraggable(square, resizer, container) {
    let isResizing = false;
    let isDragging = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    square.addEventListener('mousedown', initDrag);
    resizer.addEventListener('mousedown', initResize);

    function initDrag(e) {
        if (e.target === resizer) return; 
        isDragging = true;
        startX = e.clientX - square.offsetLeft;
        startY = e.clientY - square.offsetTop;
        e.preventDefault();
    }

    function initResize(e) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(square).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(square).height, 10);
        startLeft = square.offsetLeft;
        startTop = square.offsetTop;
        e.preventDefault();
        e.stopPropagation();
    }

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const newLeft = e.clientX - startX;
            const newTop = e.clientY - startY;
            square.style.left = `${Math.max(padding, Math.min(newLeft, container.offsetWidth - square.offsetWidth - padding))}px`;
            square.style.top = `${Math.max(padding, Math.min(newTop, container.offsetHeight - square.offsetHeight - padding))}px`;
        } else if (isResizing) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const delta = Math.max(dx, dy);
            
            const newSize = Math.max(startWidth + delta, minSquareSize);
            const maxSize = Math.min(
                container.offsetWidth - startLeft - padding,
                container.offsetHeight - startTop - padding
            );
            
            const size = Math.min(newSize, maxSize);
            
            square.style.width = `${size}px`;
            square.style.height = `${size}px`;
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        isResizing = false;
    });
}

squareColorSelect.addEventListener('change', function() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.style.backgroundColor = this.value;
    });
});