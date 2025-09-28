// Custom Alert Functions
function showAlert(message, title = 'Notice', icon = 'info') {
    const overlay = document.getElementById('customAlert');
    const titleElement = overlay.querySelector('.alert-title');
    const messageElement = overlay.querySelector('.alert-message');
    const iconElement = overlay.querySelector('.alert-icon .material-icons');

    titleElement.textContent = title;
    messageElement.textContent = message;
    iconElement.textContent = icon;

    overlay.classList.add('show');

    // Focus on button for accessibility
    setTimeout(() => {
        const button = overlay.querySelector('.alert-button');
        if (button) button.focus();
    }, 100);
}

function closeAlert() {
    const overlay = document.getElementById('customAlert');
    overlay.classList.remove('show');
}

// Click outside to close
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('customAlert');
    if (e.target === overlay && overlay.classList.contains('show')) {
        closeAlert();
    }
});

// Keyboard support
document.addEventListener('keydown', function(e) {
    const overlay = document.getElementById('customAlert');
    if (overlay && overlay.classList.contains('show')) {
        if (e.key === 'Escape' || e.key === 'Enter') {
            closeAlert();
        }
    }
});

// Model list
const models = [
    "100Q7800H", "86X8700G", "86X8500G", "75X8700G", "75X8500G",
    "75Q6600H", "65X8700G", "65X8500G", "65Q6620G", "60Q6600H",
    "55Q6600H", "43E5520H", "40E5520H", "32E5520H"
];

// Inventory data
let inventoryData = {};
let salesHistory = [];
let isEditMode = false;
let selectedSalesDate = new Date(); // Track the selected date for sales view
let monthlyTargets = {
    revenue: 500000,
    totalUnits: 150,
    structureUnits: 100
}; // Default monthly targets

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeInventory();
    initializeProductAttributes();
    loadData();
    loadProductPrices();
    renderInventoryTable();
    setDefaultDates();

    // Add test sales data if empty
    if (salesHistory.length === 0) {
        addTestSalesData();
    }

    // Add keyboard navigation for date picker
    document.addEventListener('keydown', handleDateNavigationKeys);
});

// Handle keyboard navigation for date picker
function handleDateNavigationKeys(e) {
    // Only handle keys when in sales page and today view is active
    const salesPage = document.getElementById('salesPage');
    const todayView = document.getElementById('todayView');

    if (!salesPage.classList.contains('active') || !todayView.classList.contains('active')) {
        return;
    }

    // Handle arrow keys for date navigation
    if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        navigateDate(-1);
    } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        navigateDate(1);
    }
}

// Add test sales data for demonstration
function addTestSalesData() {
    const today = new Date();
    const testSales = [];

    // Add sales for last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Random sales for each day
        testSales.push({
            date: dateStr,
            items: [
                { model: "75X8700G", quantity: Math.floor(Math.random() * 3) + 1 },
                { model: "65X8500G", quantity: Math.floor(Math.random() * 2) + 1 },
                { model: "55Q6600H", quantity: Math.floor(Math.random() * 2) + 1 }
            ].filter(item => item.quantity > 0)
        });
    }

    salesHistory = testSales;
    saveData();
}

// Initialize inventory data
function initializeInventory() {
    models.forEach(model => {
        if (!inventoryData[model]) {
            inventoryData[model] = {
                stock: 0,
                safetyStock: 0
            };
        }
    });
}

// Load data from localStorage
function loadData() {
    const savedInventory = localStorage.getItem('makroInventory');
    const savedSales = localStorage.getItem('makroSales');
    const savedTargets = localStorage.getItem('makroMonthlyTargets');

    if (savedInventory) {
        inventoryData = { ...inventoryData, ...JSON.parse(savedInventory) };
    }
    if (savedSales) {
        salesHistory = JSON.parse(savedSales);
        calculateSafetyStock();
    }

    if (savedTargets) {
        monthlyTargets = JSON.parse(savedTargets);
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('makroInventory', JSON.stringify(inventoryData));
    localStorage.setItem('makroSales', JSON.stringify(salesHistory));
    localStorage.setItem('makroMonthlyTargets', JSON.stringify(monthlyTargets));
}

// Calculate safety stock based on customizable days
// Default: Sum of last 8 days sales (7 days delivery + 1 day buffer)
function calculateSafetyStock() {
    const today = new Date();
    const daysAgo = new Date();
    daysAgo.setDate(today.getDate() - safetyStockDays);

    // Reset safety stock
    models.forEach(model => {
        inventoryData[model].safetyStock = 0;
    });

    // Calculate sum of sales within specified days
    salesHistory.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate >= daysAgo && saleDate <= today) {
            sale.items.forEach(item => {
                if (inventoryData[item.model]) {
                    inventoryData[item.model].safetyStock += item.quantity;
                }
            });
        }
    });
}

// Render inventory table
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    // Sort: out of stock and low stock items first
    const sortedModels = [...models].sort((a, b) => {
        const aData = inventoryData[a];
        const bData = inventoryData[b];

        // Out of stock has highest priority
        if (aData.stock === 0 && bData.stock > 0) return -1;
        if (aData.stock > 0 && bData.stock === 0) return 1;

        // Low stock comes next
        const aWarning = aData.stock < aData.safetyStock;
        const bWarning = bData.stock < bData.safetyStock;
        if (aWarning && !bWarning) return -1;
        if (!aWarning && bWarning) return 1;

        return 0;
    });

    sortedModels.forEach(model => {
        const data = inventoryData[model];
        const row = document.createElement('tr');

        // Determine status
        let rowClass = '';
        let statusBadge = '';

        if (data.stock === 0) {
            rowClass = 'danger-row';
            statusBadge = '<span class="status-badge status-danger">Out of Stock</span>';
        } else if (data.stock < data.safetyStock && data.safetyStock > 0) {
            rowClass = 'warning-row';
            statusBadge = '<span class="status-badge status-warning">Low Stock</span>';
        } else {
            statusBadge = '<span class="status-badge status-normal">Normal</span>';
        }

        if (rowClass) {
            row.className = rowClass;
        }

        row.innerHTML = `
            <td class="model-cell" ${isEditMode ? 'contenteditable="true"' : ''}
                onblur="updateModel('${model}', this.textContent)">${model}</td>
            <td class="stock-cell ${isEditMode ? 'editable' : ''}" data-model="${model}">
                ${isEditMode ?
                    `<input type="number" class="stock-input" value="${data.stock}" min="0" onchange="updateStock('${model}', this.value)">` :
                    data.stock
                }
            </td>
            <td class="safety-cell" ${isEditMode ? 'contenteditable="true"' : ''}
                onblur="updateSafetyStock('${model}', this.textContent)">${data.safetyStock}</td>
            <td>${statusBadge}</td>
            ${isEditMode ? `<td class="action-cell">
                <button class="delete-row-btn" onclick="deleteRow('${model}')">
                    <span class="material-icons">delete</span>
                </button>
            </td>` : ''}
        `;

        tbody.appendChild(row);
    });

    // Add new row button in edit mode
    if (isEditMode) {
        const addRow = document.createElement('tr');
        addRow.className = 'add-row';
        addRow.innerHTML = `
            <td colspan="5" style="text-align: center; padding: 12px;">
                <button class="add-row-btn" onclick="showAddRowDialog()">
                    <span class="material-icons">add</span>
                    <span>Add New Model</span>
                </button>
            </td>
        `;
        tbody.appendChild(addRow);
    }
}

// Toggle edit mode
function toggleUpdateMode() {
    isEditMode = !isEditMode;
    const btn = document.querySelector('.update-btn');
    const thead = document.querySelector('.inventory-table thead tr');

    if (isEditMode) {
        btn.classList.add('active');
        // Add action column header
        if (!document.getElementById('action-header')) {
            const th = document.createElement('th');
            th.id = 'action-header';
            th.textContent = 'Actions';
            thead.appendChild(th);
        }
        renderInventoryTable();
    } else {
        btn.classList.remove('active');
        // Remove action column header
        const actionHeader = document.getElementById('action-header');
        if (actionHeader) {
            actionHeader.remove();
        }
        saveData();
        renderInventoryTable();
    }
}

// Update stock (direct edit)
function updateStock(model, value) {
    const stock = parseInt(value) || 0;
    inventoryData[model].stock = stock;
    saveData();
}

// Update model name
function updateModel(oldModel, newModel) {
    newModel = newModel.trim();
    if (newModel && newModel !== oldModel && !inventoryData[newModel]) {
        inventoryData[newModel] = inventoryData[oldModel];
        delete inventoryData[oldModel];

        // Update models array
        const index = models.indexOf(oldModel);
        if (index > -1) {
            models[index] = newModel;
        }

        saveData();
        renderInventoryTable();
    } else if (newModel !== oldModel) {
        renderInventoryTable(); // Restore original value
    }
}

// Update safety stock
function updateSafetyStock(model, value) {
    const safetyStock = parseInt(value) || 0;
    inventoryData[model].safetyStock = safetyStock;
    saveData();
    renderInventoryTable();
}

// Delete row
function deleteRow(model) {
    if (confirm(`Are you sure you want to delete model ${model}?`)) {
        delete inventoryData[model];
        const index = models.indexOf(model);
        if (index > -1) {
            models.splice(index, 1);
        }
        saveData();
        renderInventoryTable();
    }
}

// Show add new row dialog
function showAddRowDialog() {
    const newModel = prompt('Please enter new product model:');
    if (newModel && newModel.trim()) {
        const trimmedModel = newModel.trim();
        if (!inventoryData[trimmedModel]) {
            models.push(trimmedModel);
            inventoryData[trimmedModel] = {
                stock: 0,
                safetyStock: 0
            };
            saveData();
            renderInventoryTable();
        } else {
            showAlert('This model already exists!', 'Duplicate Entry', 'warning');
        }
    }
}

// Show unified form (from Home page - only Update Stock)
function showUnifiedForm() {
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('unifiedFormPage').classList.add('active');

    // Hide tabs when coming from Home page (only show Update Stock)
    const tabsContainer = document.querySelector('.form-tabs');
    if (tabsContainer) {
        tabsContainer.style.display = 'none';
    }

    // Update title and hide subtitle
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    if (formTitle) formTitle.textContent = 'Stock Update';
    if (formSubtitle) formSubtitle.style.display = 'none';

    // Show only update mode
    switchFormMode('update');

    // Clear any existing items
    document.getElementById('updateItems').innerHTML = '';
}


// Close unified form
function closeUnifiedForm() {
    document.getElementById('unifiedFormPage').classList.remove('active');

    // Check if we came from Sales Analytics page
    const salesPageActive = document.querySelector('.nav-btn:first-child.active');
    if (salesPageActive) {
        document.getElementById('salesPage').classList.add('active');
    } else {
        document.getElementById('homePage').classList.add('active');
    }

    // Restore tabs visibility
    const tabsContainer = document.querySelector('.form-tabs');
    if (tabsContainer) {
        tabsContainer.style.display = 'flex';
    }

    // Restore subtitle
    const formSubtitle = document.getElementById('formSubtitle');
    if (formSubtitle) formSubtitle.style.display = 'inline';

    // Clear forms
    document.getElementById('updateItems').innerHTML = '';
    document.getElementById('salesItems').innerHTML = '';
}

// Switch form mode
function switchFormMode(mode) {
    const updateTab = document.getElementById('updateTab');
    const salesTab = document.getElementById('salesTab');
    const updateContent = document.getElementById('updateFormContent');
    const salesContent = document.getElementById('salesFormContent');
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');

    if (mode === 'update') {
        updateTab.classList.add('active');
        salesTab.classList.remove('active');
        updateContent.classList.add('active');
        salesContent.classList.remove('active');
        formTitle.textContent = 'Stock Update';
        formSubtitle.textContent = 'Update product stock quantity';

        // Add first item (if none exists)
        if (document.getElementById('updateItems').children.length === 0) {
            addUpdateItem();
        }
    } else if (mode === 'sales') {
        updateTab.classList.remove('active');
        salesTab.classList.add('active');
        updateContent.classList.remove('active');
        salesContent.classList.add('active');
        formTitle.textContent = 'Sales Entry';
        formSubtitle.textContent = 'Enter daily sales data';

        // Add first item (if none exists)
        if (document.getElementById('salesItems').children.length === 0) {
            addSalesItem();
        }
    }
}

// Add update item
function addUpdateItem() {
    const container = document.getElementById('updateItems');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';

    itemRow.innerHTML = `
        <select class="model-select" onchange="updateStockPlaceholder(this)" required>
            <option value="">Select Product Model</option>
            ${models.map(model => `<option value="${model}">${model}</option>`).join('')}
        </select>
        <input type="number" class="quantity-input" placeholder="Stock Qty" min="0" required aria-label="Update quantity">
        <button class="remove-item-btn" onclick="this.parentElement.remove()" aria-label="Remove item">
            <span class="material-icons">close</span>
        </button>
    `;

    container.appendChild(itemRow);
}

// Update stock placeholder when model is selected
function updateStockPlaceholder(selectElement) {
    const model = selectElement.value;
    const quantityInput = selectElement.parentElement.querySelector('.quantity-input');

    if (model) {
        const currentStock = inventoryData[model]?.stock || 0;
        quantityInput.value = currentStock;
        quantityInput.placeholder = `Current: ${currentStock}`;
    } else {
        quantityInput.value = '';
        quantityInput.placeholder = 'Stock Qty';
    }
}

// Submit stock update from item-based form
function submitStockUpdate() {
    console.log('submitStockUpdate called'); // Debug log

    const date = document.getElementById('updateDate').value;
    if (!date) {
        showAlert('Please select update date', 'Required Field', 'warning');
        return;
    }

    // Validate date is not in the future
    const selectedDate = new Date(date + 'T12:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
        showAlert('Cannot update stock for future dates', 'Invalid Date', 'error');
        return;
    }

    const items = document.querySelectorAll('#updateItems .item-row');

    if (items.length === 0) {
        showAlert('Please add at least one product to update', 'No Products Added', 'warning');
        return;
    }

    let hasValidUpdates = false;
    let hasChanges = false;

    items.forEach(item => {
        const modelSelect = item.querySelector('.model-select');
        const quantityInput = item.querySelector('.quantity-input');

        const model = modelSelect.value;
        const newStock = parseInt(quantityInput.value);

        if (model && !isNaN(newStock) && newStock >= 0) {
            hasValidUpdates = true;
            const currentStock = inventoryData[model]?.stock || 0;

            if (newStock !== currentStock) {
                hasChanges = true;
                inventoryData[model].stock = newStock;
            }
        }
    });

    if (!hasValidUpdates) {
        console.log('No valid updates'); // Debug log
        showAlert('Please select product model and enter valid stock quantity', 'Invalid Data', 'warning');
        return;
    }

    if (!hasChanges) {
        console.log('No changes detected'); // Debug log
        showAlert('No stock changes detected. The new stock values are same as current stock.', 'No Changes', 'info');
        return;
    }

    console.log('Saving data and showing success'); // Debug log

    saveData();
    renderInventoryTable();
    calculateSafetyStock();  // Fixed function name

    // Show success message BEFORE closing form
    showAlert('Stock update submitted successfully!', 'Success', 'check_circle');

    // Close form after a short delay
    setTimeout(() => {
        closeUnifiedForm();
    }, 1500);
}

// Submit update (for sales form)
function submitUpdate() {
    const date = document.getElementById('updateDate').value;
    if (!date) {
        showAlert('Please select update date', 'Required Field', 'warning');
        return;
    }

    const items = document.querySelectorAll('#updateItems .item-row');
    let hasValidItem = false;

    items.forEach(item => {
        const model = item.querySelector('.model-select').value;
        const quantity = parseInt(item.querySelector('.quantity-input').value) || 0;

        if (model && quantity >= 0) {
            inventoryData[model].stock = quantity;
            hasValidItem = true;
        }
    });

    if (!hasValidItem) {
        showAlert('Please fill in at least one valid stock update record', 'Validation Error', 'warning');
        return;
    }

    saveData();
    renderInventoryTable();
    closeUnifiedForm();
    showAlert('Stock update submitted successfully!', 'Success', 'check_circle');
}


// Add sales item
function addSalesItem() {
    const container = document.getElementById('salesItems');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';

    itemRow.innerHTML = `
        <select class="model-select" required>
            <option value="">Select Product Model</option>
            ${models.map(model => `<option value="${model}">${model}</option>`).join('')}
        </select>
        <input type="number" class="quantity-input" placeholder="Sales Qty" min="1" required aria-label="Sales quantity">
        <button class="remove-item-btn" onclick="this.parentElement.remove()" aria-label="Remove item">
            <span class="material-icons">close</span>
        </button>
    `;

    container.appendChild(itemRow);
}

// Submit sales
function submitSales() {
    const date = document.getElementById('salesDate').value;
    if (!date) {
        showAlert('Please select sales date', 'Required Field', 'warning');
        return;
    }

    // Validate date is not in the future
    const selectedDate = new Date(date + 'T12:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
        showAlert('Cannot record sales for future dates', 'Invalid Date', 'error');
        return;
    }

    const items = document.querySelectorAll('#salesItems .item-row');
    const saleItems = [];

    items.forEach(item => {
        const model = item.querySelector('.model-select').value;
        const quantity = parseInt(item.querySelector('.quantity-input').value) || 0;

        if (model && quantity > 0) {
            // Check if stock is sufficient
            if (inventoryData[model].stock < quantity) {
                showAlert(`Product model ${model} has insufficient stock! Current stock quantity: ${inventoryData[model].stock}`, 'Stock Alert', 'error');
                return;
            }
            saleItems.push({ model, quantity });
        }
    });

    if (saleItems.length === 0) {
        showAlert('Please fill in at least one valid sales record', 'Validation Error', 'warning');
        return;
    }

    // Update stock
    saleItems.forEach(item => {
        inventoryData[item.model].stock -= item.quantity;
    });

    // Save sales record
    salesHistory.push({
        date: date,
        items: saleItems
    });

    // Recalculate safety stock
    calculateSafetyStock();

    saveData();
    renderInventoryTable();

    // Refresh all sales views if we're on the sales page
    const salesPage = document.getElementById('salesPage');
    if (salesPage && salesPage.classList.contains('active')) {
        loadSalesData(); // Update Today, Week, and Month views
    }

    closeUnifiedForm();
    showAlert('Sales record submitted successfully!', 'Success', 'check_circle');
}

// Set default date to today
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const updateDateInput = document.getElementById('updateDate');
    const salesDateInput = document.getElementById('salesDate');

    if (updateDateInput) {
        updateDateInput.value = today;
        updateDateInput.max = today; // Prevent future dates
    }

    if (salesDateInput) {
        salesDateInput.value = today;
        salesDateInput.max = today; // Prevent future dates
    }
}

// Export inventory data to Excel
function exportToExcel() {
    // Prepare data
    const data = [];
    const headers = ['Product Model', 'Current Stock', 'Safety Stock', 'Status', 'Stock Difference'];

    models.forEach(model => {
        const inv = inventoryData[model];
        let status = 'Normal';
        if (inv.stock === 0) {
            status = 'Out of Stock';
        } else if (inv.stock < inv.safetyStock) {
            status = 'Low Stock';
        }

        data.push([
            model,
            inv.stock,
            inv.safetyStock,
            status,
            inv.stock - inv.safetyStock
        ]);
    });

    // Create CSV content (Excel can open CSV)
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += headers.join(',') + '\n';
    data.forEach(row => {
        csvContent += row.join(',') + '\n';
    });

    // Add summary information
    csvContent += '\n\nSummary\n';
    csvContent += 'Total Models,' + models.length + '\n';
    csvContent += 'Out of Stock Count,' + data.filter(row => row[3] === 'Out of Stock').length + '\n';
    csvContent += 'Low Stock Count,' + data.filter(row => row[3] === 'Low Stock').length + '\n';
    csvContent += 'Export Time,' + new Date().toLocaleString('en-US') + '\n';

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fileName = `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Product prices (in Rand)
// Product prices (now stored in localStorage for editing)
let productPrices = {
    "100Q7800H": 45000,
    "86X8700G": 35000,
    "86X8500G": 32000,
    "75X8700G": 25000,
    "75X8500G": 22000,
    "75Q6600H": 20000,
    "65X8700G": 18000,
    "65X8500G": 16000,
    "65Q6620G": 15000,
    "60Q6600H": 12000,
    "55Q6600H": 10000,
    "43E5520H": 7000,
    "40E5520H": 6000,
    "32E5520H": 4500
};

// Load saved prices from localStorage
function loadProductPrices() {
    const saved = localStorage.getItem('makroProductPrices');
    if (saved) {
        productPrices = { ...productPrices, ...JSON.parse(saved) };
    }
}

// Save prices to localStorage
function saveProductPrices() {
    localStorage.setItem('makroProductPrices', JSON.stringify(productPrices));
}

// Product attributes (stored in localStorage)
let productAttributes = {};

// Safety stock calculation days (default is 8 days)
let safetyStockDays = 8;

// Initialize product attributes
function initializeProductAttributes() {
    // Load saved attributes or set defaults
    const saved = localStorage.getItem('makroProductAttributes');
    if (saved) {
        productAttributes = JSON.parse(saved);
    } else {
        // Initialize with defaults
        models.forEach(model => {
            productAttributes[model] = {
                status: 'usual', // 'usual' or 'clean'
                category: 'non-push' // 'push' or 'non-push'
            };
        });

        // Set default structure products as push
        const defaultStructure = ["100Q7800H", "86X8700G", "86X8500G", "75X8700G", "75Q6600H", "65X8700G", "65Q6620G"];
        defaultStructure.forEach(model => {
            if (productAttributes[model]) {
                productAttributes[model].category = 'push';
            }
        });

        saveProductAttributes();
    }

    // Load safety stock calculation days setting
    const savedSafetyStockDays = localStorage.getItem('makroSafetyStockDays');
    if (savedSafetyStockDays) {
        safetyStockDays = parseInt(savedSafetyStockDays) || 8;
    }
}

// Save product attributes
function saveProductAttributes() {
    localStorage.setItem('makroProductAttributes', JSON.stringify(productAttributes));
}

// Get structure products dynamically
function getStructureProducts() {
    return models.filter(model =>
        productAttributes[model] && productAttributes[model].category === 'push'
    );
}


// Page navigation
function showPage(page) {
    // Update page title based on current page
    const pageTitle = document.getElementById('pageTitle');

    if (page === 'home') {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('homePage').classList.add('active');

        // Update page title
        if (pageTitle) pageTitle.textContent = 'Inventory Management';

        // Update navigation bar status
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
    } else if (page === 'sales' || page === 'salesHistory') {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('salesPage').classList.add('active');

        // Update page title
        if (pageTitle) pageTitle.textContent = 'Sales History';

        // Update navigation bar status
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.nav-btn')[0].classList.add('active');

        // Initialize date picker with today's date
        selectedSalesDate = new Date();
        updateDateDisplay();

        // Load sales data
        loadSalesData();
    } else if (page === 'personal') {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('personalPage').classList.add('active');

        // Update page title
        if (pageTitle) pageTitle.textContent = 'Inventory Management';

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.nav-btn')[2].classList.add('active');

        // Load personal page data
        loadPersonalPage();
    }
}

// Switch time view in Sales page
function switchTimeView(view) {
    // Update button states
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Update view visibility
    document.querySelectorAll('.time-view').forEach(v => v.classList.remove('active'));
    document.getElementById(view + 'View').classList.add('active');

    // Keep Add Sales button visible in all views
    const addSalesBtn = document.getElementById('addSalesBtn');
    if (addSalesBtn) {
        addSalesBtn.style.display = 'flex';
    }

    // Load corresponding data
    if (view === 'today') {
        loadTodayData();
    } else if (view === 'week') {
        loadWeekData();
    } else if (view === 'month') {
        loadMonthData();
    }
}

// Open sales form from analytics page
function openSalesFormFromAnalytics() {
    // Get current view to determine date
    const activeView = document.querySelector('.time-view.active');
    const isToday = activeView && activeView.id === 'todayView';

    // Navigate to unified form in sales mode
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('unifiedFormPage').classList.add('active');

    // Hide the tab switcher and show only sales form
    const tabsContainer = document.querySelector('.form-tabs');
    if (tabsContainer) {
        tabsContainer.style.display = 'none';
    }

    // Update header to show only Sales Entry
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    if (formTitle) formTitle.textContent = 'Sales Entry';
    if (formSubtitle) formSubtitle.style.display = 'none';

    // Show only sales form content
    document.getElementById('updateFormContent').classList.remove('active');
    document.getElementById('salesFormContent').classList.add('active');

    // Add first sales item if none exists
    if (document.getElementById('salesItems').children.length === 0) {
        addSalesItem();
    }

    // Pre-populate with selected date if in Today view
    if (isToday) {
        const selectedDateStr = selectedSalesDate.toISOString().split('T')[0];
        document.getElementById('salesDate').value = selectedDateStr;
        // Set current time
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const salesTimeInput = document.getElementById('salesTime');
        if (salesTimeInput) {
            salesTimeInput.value = currentTime;
        }
    }
}

// Load sales data for different views
function loadSalesData() {
    loadTodayData();
    loadWeekData();
    loadMonthData();
}

// Delete sale item
function deleteSaleItem(saleDate, model, quantity) {
    // Find the sale in history
    const sale = salesHistory.find(s => s.date === saleDate);
    if (!sale) return;

    // Find the item in the sale
    const itemIndex = sale.items.findIndex(item => item.model === model && item.quantity === quantity);
    if (itemIndex === -1) return;

    // Restore stock
    inventoryData[model].stock += quantity;

    // Remove the item
    sale.items.splice(itemIndex, 1);

    // If no items left in sale, remove the entire sale
    if (sale.items.length === 0) {
        const saleHistoryIndex = salesHistory.indexOf(sale);
        if (saleHistoryIndex > -1) {
            salesHistory.splice(saleHistoryIndex, 1);
        }
    }

    // Save and refresh
    saveData();
    renderInventoryTable();
    calculateSafetyStock();
    loadSalesData(); // Refresh all sales views (Today, Week, Month)

    showAlert('Sale record deleted', 'Success', 'check_circle');
}

// Navigate to previous/next day
function navigateDate(direction) {
    const newDate = new Date(selectedSalesDate);
    newDate.setDate(newDate.getDate() + direction);

    // Don't allow future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (newDate > today) {
        showAlert('Cannot select future dates', 'Invalid Date', 'warning');
        return;
    }

    selectedSalesDate = newDate;
    updateDateDisplay();
    loadTodayData();
}

// Handle date picker change
function onDateChange() {
    const datePicker = document.getElementById('selectedDate');
    const newDate = new Date(datePicker.value + 'T12:00:00'); // Set to noon to avoid timezone issues

    // Don't allow future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (newDate > today) {
        showAlert('Cannot select future dates', 'Invalid Date', 'warning');
        // Reset to today's date
        selectedSalesDate = new Date();
        updateDateDisplay();
        return;
    }

    selectedSalesDate = newDate;
    updateDateDisplay();
    loadTodayData();
}

// Open date picker when clicking on display
function openDatePicker() {
    const datePicker = document.getElementById('selectedDate');
    if (datePicker) {
        // Try modern showPicker method first
        if (datePicker.showPicker) {
            datePicker.showPicker();
        } else {
            // Fallback for older browsers
            datePicker.focus();
            datePicker.click();
        }
    }
}

// Update the date display elements
function updateDateDisplay() {
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const datePicker = document.getElementById('selectedDate');

    if (selectedDateDisplay) {
        selectedDateDisplay.textContent = selectedSalesDate.toLocaleDateString('en-US', dateOptions);
    }

    if (datePicker) {
        datePicker.value = selectedSalesDate.toISOString().split('T')[0];
        // Set max date to today
        const today = new Date().toISOString().split('T')[0];
        datePicker.max = today;
    }
}

// Load sales data for the selected date (previously loadTodayData)
function loadTodayData() {
    const selectedDateStr = selectedSalesDate.toISOString().split('T')[0];
    const selectedSales = salesHistory.filter(sale => sale.date === selectedDateStr);

    // Update the date display
    updateDateDisplay();

    let totalUnits = 0;
    let structureUnits = 0;
    let totalRevenue = 0;
    const salesDetails = [];

    selectedSales.forEach((sale) => {
        sale.items.forEach((item) => {
            totalUnits += item.quantity;
            if (getStructureProducts().includes(item.model)) {
                structureUnits += item.quantity;
            }
            const price = productPrices[item.model] || 0;
            totalRevenue += price * item.quantity;

            // Add as single row with quantity
            salesDetails.push({
                model: item.model,
                quantity: item.quantity,
                price: price,
                time: new Date(sale.date + 'T' + (sale.time || '12:00')).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}),
                saleDate: sale.date,
                originalSaleIndex: salesHistory.indexOf(sale)
            });
        });
    });

    // Update UI
    document.getElementById('todayUnits').textContent = totalUnits;
    document.getElementById('todayStructure').textContent = structureUnits;

    // Display full revenue number
    document.getElementById('todayRevenue').textContent = 'ZAR ' + totalRevenue.toLocaleString();

    // Add motivational message if no sales today
    if (totalUnits === 0) {
        const motivationalDiv = document.createElement('div');
        motivationalDiv.style.cssText = `
            margin-top: 20px;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            text-align: center;
            animation: pulse 2s infinite;
        `;
        motivationalDiv.innerHTML = `
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 0;">
                💪 Try harder for better life! 💪
            </p>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0;">
                Every sale counts. Keep pushing forward!
            </p>
        `;

        // Add animation keyframes if not already added
        if (!document.querySelector('#motivationAnimation')) {
            const style = document.createElement('style');
            style.id = 'motivationAnimation';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        // Find the table container and append the message after it
        const tableContainer = document.querySelector('#todayView .sales-table-container');
        if (tableContainer && !document.querySelector('.motivation-message')) {
            motivationalDiv.className = 'motivation-message';
            tableContainer.parentNode.insertBefore(motivationalDiv, tableContainer.nextSibling);
        }
    } else {
        // Remove motivational message if sales exist
        const existingMessage = document.querySelector('.motivation-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Update table
    const tbody = document.getElementById('todayTableBody');
    tbody.innerHTML = '';

    if (salesDetails.length === 0) {
        // Show empty state
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <span class="material-icons" style="font-size: 48px; opacity: 0.3; display: block; margin-bottom: 16px;">inbox</span>
                    No sales recorded for this date
                    <br>
                    <small style="opacity: 0.7;">Click "Add Sales" to record your first sale</small>
                </td>
            </tr>
        `;
    } else {
        salesDetails.forEach((detail) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${detail.model}</td>
                <td style="text-align: center;">${detail.quantity}</td>
                <td>ZAR ${detail.price.toLocaleString()}</td>
                <td>${detail.time}</td>
                <td style="text-align: center;">
                    <button class="delete-sale-btn" onclick="deleteSaleItem('${detail.saleDate}', '${detail.model}', ${detail.quantity})" aria-label="Delete sale">
                        <span class="material-icons">close</span>
                    </button>
                </td>
            `;
        });
    }
}

// Load week data
function loadWeekData() {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    let totalUnits = 0;
    let structureUnits = 0;
    let totalRevenue = 0;
    const dailyData = [];

    // Process each day
    for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(sevenDaysAgo.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const daySales = salesHistory.filter(sale => sale.date === dateStr);
        let dayUnits = 0;
        let dayRevenue = 0;

        daySales.forEach(sale => {
            sale.items.forEach(item => {
                dayUnits += item.quantity;
                if (getStructureProducts().includes(item.model)) {
                    structureUnits += item.quantity;
                }
                dayRevenue += (productPrices[item.model] || 0) * item.quantity;
            });
        });

        totalUnits += dayUnits;
        totalRevenue += dayRevenue;
        dailyData.push({
            date: date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
            units: dayUnits,
            revenue: dayRevenue
        });
    }

    // Update UI
    document.getElementById('weekUnits').textContent = totalUnits;
    document.getElementById('weekStructure').textContent = structureUnits;

    // Display full revenue number
    document.getElementById('weekRevenue').textContent = 'ZAR ' + totalRevenue.toLocaleString();

    // Draw chart
    drawWeekChart(dailyData);
}

// Load month data
function loadMonthData() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalUnits = 0;
    let structureUnits = 0;
    let totalRevenue = 0;

    salesHistory.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
            sale.items.forEach(item => {
                totalUnits += item.quantity;
                if (getStructureProducts().includes(item.model)) {
                    structureUnits += item.quantity;
                }
                totalRevenue += (productPrices[item.model] || 0) * item.quantity;
            });
        }
    });

    // Get targets from saved data
    const targetRevenue = monthlyTargets.revenue;
    const targetTotalUnits = monthlyTargets.totalUnits;
    const targetStructureUnits = monthlyTargets.structureUnits;

    // Calculate percentages
    const revenuePercent = Math.min(100, Math.round((totalRevenue / targetRevenue) * 100));
    const totalUnitsPercent = Math.min(100, Math.round((totalUnits / targetTotalUnits) * 100));
    const structureUnitsPercent = Math.min(100, Math.round((structureUnits / targetStructureUnits) * 100));

    // Update UI - Display full revenue number
    document.getElementById('currentRevenue').textContent = 'ZAR ' + totalRevenue.toLocaleString();
    document.getElementById('revenuePercent').textContent = revenuePercent + '%';
    document.getElementById('revenueProgress').style.width = revenuePercent + '%';

    // Update total units progress
    document.getElementById('currentTotalUnits').textContent = totalUnits;
    document.getElementById('totalUnitsPercent').textContent = totalUnitsPercent + '%';
    document.getElementById('totalUnitsProgress').style.width = totalUnitsPercent + '%';

    // Update structure units progress
    document.getElementById('currentStructureUnits').textContent = structureUnits;
    document.getElementById('structureUnitsPercent').textContent = structureUnitsPercent + '%';
    document.getElementById('structureUnitsProgress').style.width = structureUnitsPercent + '%';

    // Update target displays
    document.getElementById('monthTargetRevenue').textContent = 'ZAR ' + targetRevenue.toLocaleString();
    document.getElementById('monthTargetTotalUnits').textContent = targetTotalUnits;
    document.getElementById('monthTargetStructureUnits').textContent = targetStructureUnits;
    document.getElementById('targetRevenue').textContent = 'ZAR ' + targetRevenue.toLocaleString();
    document.getElementById('targetTotalUnits').textContent = targetTotalUnits;
    document.getElementById('targetStructureUnits').textContent = targetStructureUnits;
}

// Draw week chart as line chart
function drawWeekChart(data) {
    const canvas = document.getElementById('weekChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 240;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value
    const maxValue = Math.max(...data.map(d => d.units), 5);

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        const value = Math.round(maxValue * (1 - i / 4));
        ctx.fillText(value, padding - 10, y + 3);
    }

    // Reset line dash for main line
    ctx.setLineDash([]);

    // Calculate points
    const points = data.map((day, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - (day.units / maxValue) * chartHeight;
        return { x, y, ...day };
    });

    // Draw area fill
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding + chartHeight);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Draw points
    points.forEach(point => {
        // Circle
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Value label on top
        if (point.units > 0) {
            ctx.fillStyle = '#8B5CF6';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(point.units, point.x, point.y - 10);
        }
    });

    // Draw x-axis labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    points.forEach(point => {
        ctx.fillText(point.date, point.x, height - 10);
    });

    // Draw axis lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

// Monthly Targets Dialog Functions
function editMonthlyTargets() {
    const dialog = document.getElementById('monthlyTargetsDialog');
    const revenueInput = document.getElementById('targetRevenueInput');
    const totalUnitsInput = document.getElementById('targetTotalUnitsInput');
    const structureUnitsInput = document.getElementById('targetStructureUnitsInput');

    // Pre-populate with current values
    revenueInput.value = monthlyTargets.revenue;
    if (totalUnitsInput) totalUnitsInput.value = monthlyTargets.totalUnits;
    if (structureUnitsInput) structureUnitsInput.value = monthlyTargets.structureUnits;

    // Show dialog with animation
    dialog.classList.add('show');

    // Focus on first input for accessibility
    setTimeout(() => {
        revenueInput.focus();
        revenueInput.select();
    }, 150);

    // Add keyboard support
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeTargetsDialog();
        } else if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            // Move to next input or save
            if (e.target === revenueInput) {
                unitsInput.focus();
                unitsInput.select();
            } else if (e.target === unitsInput) {
                saveMonthlyTargets();
            }
        }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    dialog._keydownHandler = handleKeyDown; // Store for cleanup
}

function closeTargetsDialog() {
    const dialog = document.getElementById('monthlyTargetsDialog');
    dialog.classList.remove('show');

    // Clean up event listener
    if (dialog._keydownHandler) {
        dialog.removeEventListener('keydown', dialog._keydownHandler);
        delete dialog._keydownHandler;
    }
}

function saveMonthlyTargets() {
    const revenueInput = document.getElementById('targetRevenueInput');
    const totalUnitsInput = document.getElementById('targetTotalUnitsInput');
    const structureUnitsInput = document.getElementById('targetStructureUnitsInput');

    // Validate inputs
    const revenue = parseInt(revenueInput.value) || 0;
    const totalUnits = parseInt(totalUnitsInput?.value) || monthlyTargets.totalUnits;
    const structureUnits = parseInt(structureUnitsInput?.value) || monthlyTargets.structureUnits;

    if (revenue <= 0) {
        showAlert('Please enter a valid revenue target greater than 0', 'Invalid Input', 'warning');
        revenueInput.focus();
        return;
    }

    if (totalUnits <= 0) {
        showAlert('Please enter a valid total units target greater than 0', 'Invalid Input', 'warning');
        if (totalUnitsInput) totalUnitsInput.focus();
        return;
    }

    if (structureUnits <= 0) {
        showAlert('Please enter a valid structure units target greater than 0', 'Invalid Input', 'warning');
        if (structureUnitsInput) structureUnitsInput.focus();
        return;
    }

    // Validate that structure units don't exceed total units
    if (structureUnits > totalUnits) {
        showAlert('Structure units cannot exceed total units', 'Invalid Input', 'warning');
        if (structureUnitsInput) structureUnitsInput.focus();
        return;
    }

    // Update targets
    monthlyTargets.revenue = revenue;
    monthlyTargets.totalUnits = totalUnits;
    monthlyTargets.structureUnits = structureUnits;

    // Save to localStorage
    saveData();

    // Update UI
    updateMonthlyTargetsDisplay();

    // Close dialog
    closeTargetsDialog();

    // Show success message
    showAlert('Monthly targets updated successfully!', 'Targets Saved', 'check_circle');
}

function updateMonthlyTargetsDisplay() {
    // Update target display values
    document.getElementById('monthTargetRevenue').textContent = `ZAR ${monthlyTargets.revenue.toLocaleString()}`;
    const totalUnitsEl = document.getElementById('monthTargetTotalUnits');
    if (totalUnitsEl) totalUnitsEl.textContent = monthlyTargets.totalUnits;
    const structureUnitsEl = document.getElementById('monthTargetStructureUnits');
    if (structureUnitsEl) structureUnitsEl.textContent = monthlyTargets.structureUnits;

    // Update progress displays
    document.getElementById('targetRevenue').textContent = `ZAR ${monthlyTargets.revenue.toLocaleString()}`;
    const targetTotalEl = document.getElementById('targetTotalUnits');
    if (targetTotalEl) targetTotalEl.textContent = monthlyTargets.totalUnits;
    const targetStructureEl = document.getElementById('targetStructureUnits');
    if (targetStructureEl) targetStructureEl.textContent = monthlyTargets.structureUnits;

    // Recalculate progress percentages
    loadMonthData();
}

// Add click outside to close for targets dialog
document.addEventListener('click', function(e) {
    const dialog = document.getElementById('monthlyTargetsDialog');

    if (dialog && dialog.classList.contains('show') && e.target === dialog) {
        closeTargetsDialog();
    }
});

// Add keyboard accessibility for clickable cards
document.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('clickable') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.target.click();
    }
});

// Load Personal Page
function loadPersonalPage() {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    models.forEach(model => {
        const attrs = productAttributes[model] || { status: 'usual', category: 'non-push' };

        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <div class="product-model">${model}</div>
            <div class="product-attributes">
                <div class="attribute-row">
                    <span class="attribute-label">Status</span>
                    <div class="toggle-with-labels">
                        <span class="toggle-label-left ${attrs.status === 'usual' ? 'active' : ''}">Usual</span>
                        <label class="attribute-toggle">
                            <input type="checkbox"
                                   data-model="${model}"
                                   data-attribute="status"
                                   ${attrs.status === 'clean' ? 'checked' : ''}
                                   onchange="toggleProductAttribute(this)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label-right ${attrs.status === 'clean' ? 'active' : ''}">Clean</span>
                    </div>
                </div>
                <div class="attribute-row">
                    <span class="attribute-label">Category</span>
                    <div class="toggle-with-labels">
                        <span class="toggle-label-left ${attrs.category === 'non-push' ? 'active' : ''}">Non-Push</span>
                        <label class="attribute-toggle">
                            <input type="checkbox"
                                   data-model="${model}"
                                   data-attribute="category"
                                   ${attrs.category === 'push' ? 'checked' : ''}
                                   onchange="toggleProductAttribute(this)">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label-right ${attrs.category === 'push' ? 'active' : ''}">Push</span>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(productItem);
    });
}

// Toggle product attribute
function toggleProductAttribute(input) {
    const model = input.dataset.model;
    const attribute = input.dataset.attribute;

    if (!productAttributes[model]) {
        productAttributes[model] = { status: 'usual', category: 'non-push' };
    }

    // Update attribute value
    if (attribute === 'status') {
        productAttributes[model].status = input.checked ? 'clean' : 'usual';
        // Update label active states
        const row = input.closest('.attribute-row');
        if (row) {
            const leftLabel = row.querySelector('.toggle-label-left');
            const rightLabel = row.querySelector('.toggle-label-right');
            if (leftLabel) leftLabel.classList.toggle('active', !input.checked);
            if (rightLabel) rightLabel.classList.toggle('active', input.checked);
        }
    } else if (attribute === 'category') {
        productAttributes[model].category = input.checked ? 'push' : 'non-push';
        // Update label active states
        const row = input.closest('.attribute-row');
        if (row) {
            const leftLabel = row.querySelector('.toggle-label-left');
            const rightLabel = row.querySelector('.toggle-label-right');
            if (leftLabel) leftLabel.classList.toggle('active', !input.checked);
            if (rightLabel) rightLabel.classList.toggle('active', input.checked);
        }
    }

    saveProductAttributes();

    // Update structure products if category changed
    if (attribute === 'category') {
        // Recalculate month data with new structure products
        loadMonthData();
    }
}

// Edit prices function (placeholder)
function editPrices() {
    // Create a modal for editing prices
    const modal = document.createElement('div');
    modal.className = 'alert-overlay show';
    modal.style.zIndex = '10000';

    const dialogContent = `
        <div class="targets-dialog" style="max-width: 500px; max-height: 80vh; overflow-y: auto;">
            <div class="targets-dialog-header">
                <div class="targets-dialog-icon">
                    <span class="material-icons">payments</span>
                </div>
                <h3 class="targets-dialog-title">Edit Product Prices</h3>
                <p class="targets-dialog-subtitle">Set prices for each product model</p>
            </div>

            <div class="targets-dialog-content" style="max-height: 50vh; overflow-y: auto;">
                ${models.map(model => `
                    <div class="targets-input-group">
                        <div class="targets-input-container">
                            <span class="material-icons targets-input-icon">sell</span>
                            <div class="targets-input-wrapper">
                                <label for="price-${model}" class="targets-input-label">${model}</label>
                                <div class="targets-input-field">
                                    <span class="currency-prefix">ZAR</span>
                                    <input type="number"
                                           id="price-${model}"
                                           class="targets-input price-input"
                                           data-model="${model}"
                                           value="${productPrices[model] || 0}"
                                           min="0"
                                           step="100">
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="targets-dialog-actions">
                <button class="targets-button secondary" onclick="closePriceModal()">
                    <span class="material-icons">close</span>
                    <span>Cancel</span>
                </button>
                <button class="targets-button primary" onclick="savePrices()">
                    <span class="material-icons">check</span>
                    <span>Save Prices</span>
                </button>
            </div>
        </div>
    `;

    modal.innerHTML = dialogContent;
    modal.id = 'priceEditModal';
    document.body.appendChild(modal);
}

function closePriceModal() {
    const modal = document.getElementById('priceEditModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function savePrices() {
    // Get all price inputs and update productPrices
    const priceInputs = document.querySelectorAll('.price-input');
    let hasChanges = false;

    priceInputs.forEach(input => {
        const model = input.dataset.model;
        const newPrice = parseFloat(input.value) || 0;

        if (productPrices[model] !== newPrice) {
            productPrices[model] = newPrice;
            hasChanges = true;
        }
    });

    if (hasChanges) {
        // Save to localStorage
        saveProductPrices();

        // Update any displayed prices in current view
        if (currentTab === 'today' || currentTab === 'week' || currentTab === 'month') {
            showSalesView(currentTab);
        }

        // Update month data to reflect new prices in revenue calculations
        if (currentTab === 'month') {
            loadMonthData();
        }

        showAlert('Product prices updated successfully!', 'Success', 'check_circle');
    }

    closePriceModal();
}

// Edit safety stock function
function editSafetyStock() {
    // Create a modal for editing safety stock calculation days
    const modal = document.createElement('div');
    modal.className = 'alert-overlay show';
    modal.style.zIndex = '10000';

    const dialogContent = `
        <div class="targets-dialog" style="max-width: 450px;">
            <div class="targets-dialog-header">
                <div class="targets-dialog-icon">
                    <span class="material-icons">warning</span>
                </div>
                <h3 class="targets-dialog-title">Safety Stock Settings</h3>
                <p class="targets-dialog-subtitle">Configure safety stock calculation period</p>
            </div>

            <div class="targets-dialog-content">
                <div style="margin-bottom: 24px; padding: 14px; background: #F0F9FF; border-radius: 8px; border: 1px solid #BAE6FD;">
                    <p style="font-size: 13px; color: #075985; margin: 0 0 8px 0; font-weight: 600;">
                        Current Calculation Method:
                    </p>
                    <p style="font-size: 12px; color: #0C4A6E; margin: 0; line-height: 1.5;">
                        Safety Stock = Sum of last <strong>${safetyStockDays} days</strong> sales<br>
                        <span style="font-size: 11px; color: #64748B;">
                            Default: 8 days (7-day delivery time + 1-day buffer)
                        </span>
                    </p>
                </div>

                <div class="targets-input-group">
                    <div class="targets-input-container">
                        <span class="material-icons targets-input-icon">schedule</span>
                        <div class="targets-input-wrapper">
                            <label for="safety-stock-days" class="targets-input-label">
                                Calculation Period (Days)
                            </label>
                            <div class="targets-input-field">
                                <input type="number"
                                       id="safety-stock-days"
                                       class="targets-input"
                                       value="${safetyStockDays}"
                                       min="1"
                                       max="30"
                                       step="1">
                                <span class="units-suffix">days</span>
                            </div>
                            <span class="targets-input-hint">
                                Enter number of past days to calculate safety stock (1-30 days)
                            </span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 12px; background: #FEF3C7; border-radius: 8px; border: 1px solid #FCD34D;">
                    <p style="font-size: 11px; color: #B45309; margin: 0; line-height: 1.5;">
                        <strong>Note:</strong> This setting will apply to all products.
                        The safety stock for each product will be recalculated based on the selected number of days.
                    </p>
                </div>
            </div>

            <div class="targets-dialog-actions">
                <button class="targets-button secondary" onclick="closeSafetyStockModal()">
                    <span class="material-icons">close</span>
                    <span>Cancel</span>
                </button>
                <button class="targets-button primary" onclick="saveSafetyStockDays()">
                    <span class="material-icons">check</span>
                    <span>Save Settings</span>
                </button>
            </div>
        </div>
    `;

    modal.innerHTML = dialogContent;
    modal.id = 'safetyStockModal';
    document.body.appendChild(modal);
}

function closeSafetyStockModal() {
    const modal = document.getElementById('safetyStockModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function saveSafetyStockDays() {
    const daysInput = document.getElementById('safety-stock-days');
    const newDays = parseInt(daysInput.value) || 8;

    // Validate input range
    if (newDays < 1 || newDays > 30) {
        showAlert('Please enter a value between 1 and 30 days', 'Invalid Input', 'warning');
        return;
    }

    if (newDays !== safetyStockDays) {
        safetyStockDays = newDays;

        // Save to localStorage
        localStorage.setItem('makroSafetyStockDays', newDays.toString());

        // Recalculate safety stock with new days
        calculateSafetyStock();

        // Update inventory table
        renderInventoryTable();

        showAlert(`Safety stock now calculated based on ${newDays} days of sales`, 'Settings Updated', 'check_circle');
    }

    closeSafetyStockModal();
}