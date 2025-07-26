// Initialize jsPDF
const { jsPDF } = window.jspdf;

// DOM Elements
const form = document.getElementById('receipt-form');
const container = document.getElementById('receipt-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const searchInput = document.getElementById('search-input');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const printAllBtn = document.getElementById('print-all-btn');
const selectModeBtn = document.getElementById('select-mode-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const receiptsPerPage = 10;
let currentPage = 1;
let filteredReceipts = [];
let isSelectMode = false;
let selectedReceipts = new Set();
let currentEditIndex = null;

// Retrieve receipts from localStorage
const getReceipts = () => JSON.parse(localStorage.getItem('receipts')) || [];

// Save receipts to localStorage
const saveReceipts = (receipts) => localStorage.setItem('receipts', JSON.stringify(receipts));

// Calculate total from description
function calculateTotalFromDescription(description) {
    const amountRegex = /(?:₱|\$)?(\d+(?:,\d{3})*(?:\.\d{2})?)(?:\s*[x*@]\s*(\d+))?/g;
    let total = 0;
    let match;
    while ((match = amountRegex.exec(description)) !== null) {
        const baseAmount = parseFloat(match[1].replace(/,/g, ''));
        const multiplier = match[2] ? parseInt(match[2]) : 1;
        total += baseAmount * multiplier;
    }
    return parseFloat(total.toFixed(2));
}

// Render receipts
const renderReceipts = () => {
    const receipts = filteredReceipts.length > 0 ? filteredReceipts : getReceipts();
    const totalPages = Math.ceil(receipts.length / receiptsPerPage);
    const start = (currentPage - 1) * receiptsPerPage;
    const end = start + receiptsPerPage;
    const receiptsToRender = receipts.slice(start, end);

    container.innerHTML = '';
    receiptsToRender.forEach((receipt, index) => {
        const card = document.createElement('div');
        card.classList.add('receipt-card');
        if (isSelectMode) card.classList.add('select-mode');

        const formattedDate = new Date(receipt.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        card.innerHTML = `
            ${isSelectMode ? `<input type="checkbox" class="receipt-checkbox" data-index="${start + index}">` : ''}
            <h3>${receipt.name}</h3>
            <p><strong>Description:</strong> ${receipt.description.replace(/\n/g, '<br>')}</p>
            <p><strong>Amount:</strong> ₱${receipt.amount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <div class="receipt-actions">
                <button onclick="editReceipt(${start + index})">Edit</button>
                <button onclick="duplicateReceipt(${start + index})">Duplicate</button>
                <button class="delete-btn" onclick="deleteReceipt(${start + index})">Delete</button>
            </div>
        `;
        container.appendChild(card);
    });

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || receipts.length === 0;

    if (isSelectMode) {
        document.querySelectorAll('.receipt-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    selectedReceipts.add(index);
                } else {
                    selectedReceipts.delete(index);
                }
                deleteSelectedBtn.disabled = selectedReceipts.size === 0;
            });
        });
    }
};

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    let amount = parseFloat(document.getElementById('amount').value);
    const dateInput = document.getElementById('date').value;
    const date = dateInput || new Date().toISOString().split('T')[0];

    if (!amount || isNaN(amount)) {
        amount = calculateTotalFromDescription(description) || 0;
        document.getElementById('amount').value = amount.toFixed(2);
    }

    const receipts = getReceipts();
    if (currentEditIndex !== null) {
        receipts[currentEditIndex] = { name, description, amount, date };
        currentEditIndex = null;
    } else {
        receipts.push({ name, description, amount, date });
    }
    saveReceipts(receipts);
    renderReceipts();
    form.reset();
});

// Edit receipt
window.editReceipt = (index) => {
    const receipts = getReceipts();
    const receipt = receipts[index];
    document.getElementById('name').value = receipt.name;
    document.getElementById('description').value = receipt.description;
    document.getElementById('amount').value = receipt.amount;
    document.getElementById('date').value = receipt.date;
    currentEditIndex = index;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Duplicate receipt
window.duplicateReceipt = (index) => {
    const receipts = getReceipts();
    const receipt = receipts[index];
    receipts.push({
        ...receipt,
        name: `${receipt.name} (Copy)`,
        date: new Date().toISOString().split('T')[0]
    });
    saveReceipts(receipts);
    renderReceipts();
};

// Delete receipt
window.deleteReceipt = (index) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
        const receipts = getReceipts();
        receipts.splice(index, 1);
        saveReceipts(receipts);
        renderReceipts();
    }
};

// Delete selected receipts
deleteSelectedBtn.addEventListener('click', () => {
    if (selectedReceipts.size === 0) return;
    if (confirm(`Delete ${selectedReceipts.size} selected receipts?`)) {
        const receipts = getReceipts();
        const indexes = Array.from(selectedReceipts).sort((a, b) => b - a);
        indexes.forEach(index => receipts.splice(index, 1));
        saveReceipts(receipts);
        selectedReceipts = new Set();
        isSelectMode = false;
        renderReceipts();
    }
});

// Toggle select mode
selectModeBtn.addEventListener('click', () => {
    isSelectMode = !isSelectMode;
    selectedReceipts = new Set();
    deleteSelectedBtn.disabled = true;
    renderReceipts();
});

// Search receipts
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    filteredReceipts = getReceipts().filter(receipt => 
        receipt.name.toLowerCase().includes(query) || 
        receipt.description.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderReceipts();
});

// Pagination
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderReceipts();
    }
});

nextBtn.addEventListener('click', () => {
    const receipts = filteredReceipts.length > 0 ? filteredReceipts : getReceipts();
    const totalPages = Math.ceil(receipts.length / receiptsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderReceipts();
    }
});

// Print all receipts
printAllBtn.addEventListener('click', () => {
    const receipts = getReceipts();
    if (receipts.length === 0) {
        alert('No receipts to print');
        return;
    }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Receipts</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; }
                    .receipt { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
                    .receipt h3 { margin-top: 0; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Receipts</h1>
                ${receipts.map(receipt => `
                    <div class="receipt">
                        <h3>${receipt.name}</h3>
                        <p><strong>Description:</strong> ${receipt.description.replace(/\n/g, '<br>')}</p>
                        <p><strong>Amount:</strong> ₱${receipt.amount.toFixed(2)}</p>
                        <p><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        })}</p>
                    </div>
                `).join('')}
                <script>
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                </script>
            </body>
        </html>
    `);
});

// Download PDF (4 rows x 2 columns)
downloadPdfBtn.addEventListener('click', () => {
    const receipts = getReceipts();
    if (receipts.length === 0) {
        alert('No receipts to download.');
        return;
    }
    const doc = new jsPDF();
    doc.setFontSize(11);
    doc.text('Receipts', 105, 10, { align: 'center' });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const numRows = 4;
    const cellWidth = (pageWidth - 3 * margin) / 2;
    const availableHeight = pageHeight - 20 - (numRows + 1) * margin;
    const cellHeight = availableHeight / numRows;
    const startX = margin;
    const startY = 20;
    let currentX = startX;
    let currentY = startY;

    receipts.forEach((receipt, index) => {
        const padding = 2;
        const lineHeight = 4.5;
        const maxTextWidth = cellWidth - 2 * padding;
        const wrappedDescription = doc.splitTextToSize(receipt.description, maxTextWidth);

        doc.setDrawColor(0);
        doc.rect(currentX, currentY, cellWidth, cellHeight);

        let textY = currentY + padding + 3;
        doc.setFontSize(8);

        doc.text(`Name: ${receipt.name}`, currentX + padding, textY);
        textY += lineHeight;

        let maxLines = Math.floor((cellHeight - 5 * lineHeight) / lineHeight);
        wrappedDescription.slice(0, maxLines).forEach(line => {
            doc.text(line, currentX + padding, textY);
            textY += lineHeight;
        });

        doc.text(`Amount: P${receipt.amount.toFixed(2)}`, currentX + padding, textY);
        textY += lineHeight;
        doc.text(`Date: ${new Date(receipt.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        })}`, currentX + padding, textY);

        if (currentX + cellWidth + margin > pageWidth - margin) {
            currentX = startX;
            currentY += cellHeight + margin;
            if (currentY + cellHeight > pageHeight - margin) {
                doc.addPage();
                doc.setFontSize(11);
                doc.text('Receipts', 105, 10, { align: 'center' });
                currentX = startX;
                currentY = startY;
            }
        } else {
            currentX += cellWidth + margin;
        }
    });

    doc.save('receipts.pdf');
});

// Real-time amount calculation
document.getElementById('description').addEventListener('input', function () {
    const description = this.value;
    const calculated = calculateTotalFromDescription(description);
    const feedback = document.getElementById('amount-feedback');

    if (calculated > 0) {
        feedback.textContent = `Detected total: ₱${calculated.toFixed(2)}`;
        feedback.style.color = '#28a745';
        if (!document.getElementById('amount').value || isNaN(document.getElementById('amount').value)) {
            document.getElementById('amount').value = calculated.toFixed(2);
        }
    } else {
        feedback.textContent = 'No amounts detected';
        feedback.style.color = '#dc3545';
    }
});

// Initialize
renderReceipts();
