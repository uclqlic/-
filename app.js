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

// Model list (mutable for adding/removing models)
let models = [
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
    updateSalesColumnHeader();
    renderInventoryTable();
    initCustomDatePickers();
    setDefaultDatesCustom();
    forceEnglishDateInputs();

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

        // Random sales for each day - include ALL models
        const dailyItems = [];
        models.forEach(model => {
            // Random chance (60%) of having sales for each model
            if (Math.random() < 0.6) {
                const quantity = Math.floor(Math.random() * 3) + 1;
                dailyItems.push({ model: model, quantity: quantity });
            }
        });

        // Ensure at least some sales each day
        if (dailyItems.length === 0) {
            // Add at least 3 random models
            const randomModels = [...models].sort(() => Math.random() - 0.5).slice(0, 3);
            randomModels.forEach(model => {
                dailyItems.push({ model: model, quantity: Math.floor(Math.random() * 2) + 1 });
            });
        }

        testSales.push({
            date: dateStr,
            items: dailyItems
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
    const savedModels = localStorage.getItem('makroModels');

    // Load models first
    if (savedModels) {
        models = JSON.parse(savedModels);
    }

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
    localStorage.setItem('makroModels', JSON.stringify(models));
}

// Calculate safety stock based on customizable days
// Default: Sum of last 9 days sales
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

// Calculate sales for the safety stock period (default 9 days)
function calculatePeriodSales(model) {
    const today = new Date();
    const periodAgo = new Date();
    periodAgo.setDate(today.getDate() - safetyStockDays);

    let totalSales = 0;

    salesHistory.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate >= periodAgo && saleDate <= today) {
            sale.items.forEach(item => {
                if (item.model === model) {
                    totalSales += item.quantity;
                }
            });
        }
    });

    return totalSales;
}

// Update the Sales column header based on current period
function updateSalesColumnHeader() {
    const header = document.getElementById('salesPeriodHeader');
    if (header) {
        header.textContent = `Sales (${safetyStockDays}D)`;
    }
}

// Render inventory table
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';

    // Update the column header
    updateSalesColumnHeader();

    // Sort: out of stock items first (but not Clean products)
    const sortedModels = [...models].sort((a, b) => {
        const aData = inventoryData[a];
        const bData = inventoryData[b];

        // Check if products are marked as "Clean"
        const aIsClean = productAttributes[a] && productAttributes[a].status === 'clean';
        const bIsClean = productAttributes[b] && productAttributes[b].status === 'clean';

        // Out of stock has highest priority, but only if not Clean
        const aIsUrgent = aData.stock === 0 && !aIsClean;
        const bIsUrgent = bData.stock === 0 && !bIsClean;

        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;

        // All other items are equal priority
        return 0;
    });

    sortedModels.forEach(model => {
        const data = inventoryData[model];
        const row = document.createElement('tr');

        // Determine status
        let rowClass = '';
        let statusBadge = '';

        // Check if product is marked as "Clean" - if so, don't apply danger styling
        const isCleanProduct = productAttributes[model] && productAttributes[model].status === 'clean';

        if (data.stock === 0) {
            if (!isCleanProduct) {
                // Only apply danger row styling if not a clean product
                rowClass = 'danger-row';
            }
            statusBadge = '<span class="status-badge status-danger">OOS</span>';
        } else {
            statusBadge = '<span class="status-badge status-normal">Normal</span>';
        }

        if (rowClass) {
            row.className = rowClass;
        }

        // Calculate sales for the period (use safetyStockDays)
        const periodSales = getSalesForPeriod(model, safetyStockDays);

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
            <td class="sales-period-cell">${periodSales}</td>
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
    const btn = document.querySelector('#homePage .update-btn');
    const thead = document.querySelector('.inventory-table thead tr');

    if (isEditMode) {
        btn.classList.add('active');
        // Update button text to Save
        btn.innerHTML = `
            <span class="material-icons">save</span>
            <span>Save</span>
            <span class="btn-subtitle">Save changes</span>
        `;
        
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
        // Update button text back to Edit
        btn.innerHTML = `
            <span class="material-icons">edit_note</span>
            <span>Edit</span>
            <span class="btn-subtitle">Edit Inventory Number</span>
        `;
        
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

// Update period sales (This actually creates/updates sales record for the period)
function updatePeriodSales(model, newValue) {
    const targetSales = parseInt(newValue) || 0;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Find or create today's sales record
    let todaySales = salesHistory.find(sale => sale.date === today);

    if (!todaySales) {
        todaySales = {
            date: today,
            items: []
        };
        salesHistory.push(todaySales);
    }

    // Calculate current period sales to find the difference
    const currentPeriodSales = calculatePeriodSales(model);
    const difference = targetSales - currentPeriodSales;

    if (difference !== 0) {
        // Find or create item for this model in today's sales
        let item = todaySales.items.find(i => i.model === model);

        if (!item && difference > 0) {
            // Add new item with the difference
            todaySales.items.push({
                model: model,
                quantity: difference,
                price: productPrices[model] || 0,
                time: new Date().toTimeString().slice(0, 5)
            });
        } else if (item) {
            // Adjust existing item quantity
            item.quantity = Math.max(0, item.quantity + difference);

            // Remove item if quantity becomes 0
            if (item.quantity === 0) {
                todaySales.items = todaySales.items.filter(i => i.model !== model);
            }
        } else if (difference > 0) {
            // Create new entry for positive adjustment
            todaySales.items.push({
                model: model,
                quantity: difference,
                price: productPrices[model] || 0,
                time: new Date().toTimeString().slice(0, 5)
            });
        }
    }

    // Remove the sales record if it has no items
    if (todaySales.items.length === 0) {
        salesHistory = salesHistory.filter(sale => sale.date !== today);
    }

    // Sort sales history by date
    salesHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Recalculate safety stock since sales changed
    calculateSafetyStock();

    // Save and refresh
    saveData();
    renderInventoryTable();

    // Refresh sales views if on sales page
    const salesPage = document.getElementById('salesPage');
    if (salesPage && salesPage.classList.contains('active')) {
        loadSalesData();
    }
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

    // Ensure custom date pickers are initialized and set to today
    setTimeout(() => {
        initCustomDatePickers();
        setDefaultDatesCustom();
    }, 100);
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

    // Ensure custom date pickers are initialized after mode switch
    setTimeout(() => {
        initCustomDatePickers();
        setDefaultDatesCustom();
    }, 50);
}

// Add update item
function addUpdateItem() {
    const container = document.getElementById('updateItems');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';

    itemRow.innerHTML = `
        <select class="model-select" onchange="handleModelSelect(this, 'update')" required>
            <option value="">Select Product Model</option>
            ${models.map(model => `<option value="${model}">${model}</option>`).join('')}
            <option value="__ADD_NEW__" style="font-weight: 600; color: #8B5CF6;">+ Add New Model</option>
        </select>
        <input type="number" class="quantity-input" placeholder="Stock Qty" min="0" required aria-label="Update quantity">
        <button class="remove-item-btn" onclick="this.parentElement.remove()" aria-label="Remove item">
            <span class="material-icons">close</span>
        </button>
    `;

    container.appendChild(itemRow);
}

// Handle model selection including 'Add New Model' option
function handleModelSelect(selectElement, context) {
    if (selectElement.value === '__ADD_NEW__') {
        // Store reference to the select element
        window.currentModelSelect = selectElement;
        window.currentModelContext = context;

        // Show add model dialog
        showAddModelDialogFromForm();

        // Reset selection to empty for now
        selectElement.value = '';
    } else if (context === 'update') {
        updateStockPlaceholder(selectElement);
    }
}

// Update stock placeholder when model is selected
function updateStockPlaceholder(selectElement) {
    const model = selectElement.value;
    const quantityInput = selectElement.parentElement.querySelector('.quantity-input');

    if (model && model !== '__ADD_NEW__') {
        const currentStock = inventoryData[model]?.stock || 0;
        quantityInput.value = currentStock;
        quantityInput.placeholder = `Current: ${currentStock}`;
    } else {
        quantityInput.value = '';
        quantityInput.placeholder = 'Stock Qty';
    }
}

// Show add model dialog from form context
function showAddModelDialogFromForm() {
    const dialog = document.getElementById('addModelDialog');
    dialog.classList.add('show');
    document.getElementById('newModelInput').value = '';
    document.getElementById('newModelInput').focus();
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
        <select class="model-select" onchange="handleModelSelect(this, 'sales')" required>
            <option value="">Select Product Model</option>
            ${models.map(model => `<option value="${model}">${model}</option>`).join('')}
            <option value="__ADD_NEW__" style="font-weight: 600; color: #8B5CF6;">+ Add New Model</option>
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

// Force English locale for all date inputs
function forceEnglishDateInputs() {
    // Set English locale for all date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        // Set the locale attribute to force English
        input.setAttribute('lang', 'en-US');

        // For browsers that support it, set the locale directly
        if (input.showPicker) {
            // Modern browsers support this
            input.addEventListener('focus', function() {
                // Force English locale behavior
                this.setAttribute('lang', 'en-US');
            });
        }

        // Also handle the date picker in the sales page
        if (input.id === 'selectedDate') {
            input.setAttribute('lang', 'en-US');
        }
    });

    // Additional handling for the date display in sales page
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    if (selectedDateDisplay) {
        // Ensure the date display uses English format
        selectedDateDisplay.addEventListener('click', function() {
            const datePicker = document.getElementById('selectedDate');
            if (datePicker) {
                datePicker.setAttribute('lang', 'en-US');
            }
        });
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
            status = 'OOS';
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

// Safety stock calculation days (default is 9 days)
let safetyStockDays = 9;

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
        safetyStockDays = parseInt(savedSafetyStockDays) || 9;
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

        // Update bottom navigation bar status
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            bottomNav.querySelectorAll('.nav-btn')[1].classList.add('active'); // Home button
        }
    } else if (page === 'sales' || page === 'salesHistory') {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('salesPage').classList.add('active');

        // Update page title
        if (pageTitle) pageTitle.textContent = 'Sales History';

        // Update bottom navigation bar status
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            bottomNav.querySelectorAll('.nav-btn')[0].classList.add('active'); // Sales button
        }

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

        // Update bottom navigation bar status
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            bottomNav.querySelectorAll('.nav-btn')[2].classList.add('active'); // Personal button
        }

        // Load personal page data
        loadPersonalPage();
    }
}

// Switch time view in Sales page
function switchTimeView(view) {
    // Update button states
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the clicked button
    const clickedBtn = Array.from(document.querySelectorAll('.time-btn')).find(
        btn => btn.textContent.toLowerCase() === view.toLowerCase()
    );
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }

    // Update view visibility
    document.querySelectorAll('.time-view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(view + 'QueryView');
    if (targetView) {
        targetView.classList.add('active');
    } else {
        const fallbackView = document.getElementById(view + 'View');
        if (fallbackView) {
            fallbackView.classList.add('active');
        }
    }

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
    } else if (view === 'custom') {
        loadCustomQueryView();
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
        const salesDateInput = document.getElementById('salesDate');
        if (salesDateInput) {
            salesDateInput.value = selectedDateStr;
        }

        // Update custom date picker if it exists
        if (datePickers.salesDate) {
            datePickers.salesDate.setDate(selectedSalesDate);
        }

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
    if (!datePicker.value) return;

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
    // Use custom date picker if available
    if (datePickers.selectedDate) {
        datePickers.selectedDate.toggle();
    } else {
        // Fallback to native date picker
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
        // Ensure English locale
        datePicker.setAttribute('lang', 'en-US');
    }

    // Update custom date picker if it exists
    if (datePickers.selectedDate) {
        datePickers.selectedDate.setDate(selectedSalesDate);
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
    // Populate personal table with all product data
    renderPersonalTable();
}

// Load Custom Query View
function loadCustomQueryView() {
    // Initialize date query section
    initializeDateQuery();
    
    // Hide query results initially
    const queryResults = document.getElementById('queryResults');
    if (queryResults) {
        queryResults.style.display = 'none';
    }
}

// Render Personal Table
function renderPersonalTable() {
    const tbody = document.getElementById('personalTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    models.forEach(model => {
        const attrs = productAttributes[model] || { status: 'usual', category: 'non-push' };
        const price = productPrices[model] || 0;
        const stock = inventoryData[model]?.quantity || 0;
        const safetyStock = inventoryData[model]?.safetyStock || 20;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${model}</td>
            <td class="editable-price" data-model="${model}">${price || ''}</td>
            <td class="editable-status" data-model="${model}">${attrs.status === 'usual' ? 'Usual' : 'Clean'}</td>
            <td class="editable-category" data-model="${model}">${attrs.category === 'push' ? 'Push' : 'Non-Push'}</td>
            <td>
                <button class="view-sales-btn" onclick="viewModelSales('${model}')" title="View sales details">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
            <td class="editable-safety" data-model="${model}">${safetyStock}</td>
        `;

        tbody.appendChild(row);
    });
}

// Toggle Personal Edit Mode
let personalEditMode = false;
function togglePersonalEditMode() {
    personalEditMode = !personalEditMode;
    const editBtn = document.querySelector('#personalPage .update-btn');
    
    if (personalEditMode) {
        // Enter edit mode
        editBtn.innerHTML = `
            <span class="material-icons">save</span>
            <span>Save</span>
            <span class="btn-subtitle">Save changes</span>
        `;
        
        // Make cells editable
        makePersonalTableEditable();
        
        // Add add button
        const tbody = document.getElementById('personalTableBody');
        const addRow = document.createElement('tr');
        addRow.id = 'addNewModelRow';
        addRow.innerHTML = `
            <td colspan="7" style="text-align: center;">
                <button class="add-model-btn" onclick="addNewModelFromTable()" style="width: auto; padding: 8px 16px;">
                    <span class="material-icons">add</span>
                    <span>Add New Model</span>
                </button>
            </td>
        `;
        tbody.appendChild(addRow);
    } else {
        // Exit edit mode - save changes
        savePersonalChanges();
        
        editBtn.innerHTML = `
            <span class="material-icons">edit_note</span>
            <span>Edit</span>
            <span class="btn-subtitle">Edit product information</span>
        `;
        
        // Remove add button row
        const addRow = document.getElementById('addNewModelRow');
        if (addRow) addRow.remove();
        
        // Remove Actions header
        const actionsHeader = document.querySelector('#personalTableBody').closest('table').querySelector('th.actions-header');
        if (actionsHeader) actionsHeader.remove();
        
        // Remove all action cells
        document.querySelectorAll('#personalTableBody tr').forEach(row => {
            if (row.cells.length > 6) {
                row.deleteCell(6); // Remove the last cell (Actions)
            }
        });
        
        // Refresh table
        renderPersonalTable();
    }
}

// Make Personal Table Editable
function makePersonalTableEditable() {
    // First, add Actions header if not exists
    const thead = document.querySelector('#personalTableBody').closest('table').querySelector('thead tr');
    if (!thead.querySelector('th.actions-header')) {
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Actions';
        actionsHeader.className = 'actions-header';
        thead.appendChild(actionsHeader);
    }
    
    // Make price cells editable
    document.querySelectorAll('.editable-price').forEach(cell => {
        const model = cell.dataset.model;
        const value = cell.textContent;
        cell.innerHTML = `<input type="number" value="${value}" class="inline-edit" data-model="${model}" data-field="price" min="0" step="100">`;
    });
    
    // Make status cells editable
    document.querySelectorAll('.editable-status').forEach(cell => {
        const model = cell.dataset.model;
        const value = cell.textContent;
        const isClean = value === 'Clean';
        cell.innerHTML = `
            <label class="table-toggle" style="margin: 0;">
                <input type="checkbox" ${isClean ? 'checked' : ''} data-model="${model}" data-field="status">
                <span class="table-toggle-slider"></span>
            </label>
            <span style="margin-left: 8px;">${value}</span>
        `;
    });
    
    // Make category cells editable
    document.querySelectorAll('.editable-category').forEach(cell => {
        const model = cell.dataset.model;
        const value = cell.textContent;
        const isPush = value === 'Push';
        cell.innerHTML = `
            <label class="table-toggle" style="margin: 0;">
                <input type="checkbox" ${isPush ? 'checked' : ''} data-model="${model}" data-field="category">
                <span class="table-toggle-slider"></span>
            </label>
            <span style="margin-left: 8px;">${value}</span>
        `;
    });
    
    // Make safety stock cells editable
    document.querySelectorAll('.editable-safety').forEach(cell => {
        const model = cell.dataset.model;
        const value = cell.textContent;
        cell.innerHTML = `<input type="number" value="${value}" class="inline-edit" data-model="${model}" data-field="safety" min="0" step="1">`;
    });
    
    // Add delete buttons as new column
    document.querySelectorAll('#personalTableBody tr').forEach(row => {
        const model = row.cells[0].textContent;
        const deleteCell = document.createElement('td');
        deleteCell.innerHTML = `
            <button class="delete-model-btn" onclick="deleteModelFromTable('${model}')" title="Delete model">
                <span class="material-icons">delete</span>
            </button>
        `;
        row.appendChild(deleteCell);
    });
}

// Save Personal Changes
function savePersonalChanges() {
    // Save price changes
    document.querySelectorAll('input[data-field="price"]').forEach(input => {
        const model = input.dataset.model;
        const value = parseFloat(input.value) || 0;
        productPrices[model] = value;
    });
    
    // Save status changes
    document.querySelectorAll('input[data-field="status"]').forEach(input => {
        const model = input.dataset.model;
        if (!productAttributes[model]) {
            productAttributes[model] = { status: 'usual', category: 'non-push' };
        }
        productAttributes[model].status = input.checked ? 'clean' : 'usual';
    });
    
    // Save category changes
    document.querySelectorAll('input[data-field="category"]').forEach(input => {
        const model = input.dataset.model;
        if (!productAttributes[model]) {
            productAttributes[model] = { status: 'usual', category: 'non-push' };
        }
        productAttributes[model].category = input.checked ? 'push' : 'non-push';
    });
    
    // Save safety stock changes
    document.querySelectorAll('input[data-field="safety"]').forEach(input => {
        const model = input.dataset.model;
        const value = parseInt(input.value) || 20;
        if (!inventoryData[model]) {
            inventoryData[model] = { quantity: 0, safetyStock: 20 };
        }
        inventoryData[model].safetyStock = value;
    });
    
    // Save all data to localStorage
    saveProductPrices();
    saveProductAttributes();
    saveData();
    
    // Update inventory table if visible
    renderInventoryTable();
}

// Delete Model From Table
function deleteModelFromTable(model) {
    if (!confirm(`Are you sure you want to delete model ${model}? This will remove all data for this model.`)) {
        return;
    }
    
    // Remove from models array
    const index = models.indexOf(model);
    if (index > -1) {
        models.splice(index, 1);
    }
    
    // Remove all related data
    delete inventoryData[model];
    delete productAttributes[model];
    delete productPrices[model];
    
    // Remove sales history for this model
    salesHistory = salesHistory.filter(sale => sale.model !== model);
    
    // Save all data
    saveData();
    saveProductAttributes();
    saveProductPrices();
    
    // Remove the row from table
    const row = event.target.closest('tr');
    if (row) row.remove();
}

// Add New Model From Table
function addNewModelFromTable() {
    const newModel = prompt('Enter new model name:');
    if (!newModel) return;
    
    const modelName = newModel.trim().toUpperCase();
    
    if (models.includes(modelName)) {
        showAlert('This model already exists', 'Error', 'error');
        return;
    }
    
    // Add to models array
    models.push(modelName);
    
    // Initialize with default values
    inventoryData[modelName] = { quantity: 0, safetyStock: 20 };
    productAttributes[modelName] = { status: 'usual', category: 'non-push' };
    productPrices[modelName] = 0;
    
    // Save data
    saveData();
    saveProductAttributes();
    saveProductPrices();
    
    // Refresh table in edit mode
    renderPersonalTable();
    makePersonalTableEditable();
    
    // Re-add the add button row
    const tbody = document.getElementById('personalTableBody');
    const addRow = document.createElement('tr');
    addRow.id = 'addNewModelRow';
    addRow.innerHTML = `
        <td colspan="7" style="text-align: center;">
            <button class="add-model-btn" onclick="addNewModelFromTable()" style="width: auto; padding: 8px 16px;">
                <span class="material-icons">add</span>
                <span>Add New Model</span>
            </button>
        </td>
    `;
    tbody.appendChild(addRow);
}

// View Model Sales (眼睛按钮功能)
function viewModelSales(model) {
    // Create a popup dialog to show sales data
    const dialog = document.createElement('div');
    dialog.className = 'sales-popup-overlay show';
    dialog.innerHTML = `
        <div class="sales-popup-dialog">
            <div class="sales-popup-icon">
                <span class="material-icons">bar_chart</span>
            </div>
            <h2 class="sales-popup-title">Sales Data for ${model}</h2>
            
            <div class="sales-period-buttons">
                <button class="period-btn active" onclick="updateSalesView(this, '${model}', 1)">1 Day</button>
                <button class="period-btn" onclick="updateSalesView(this, '${model}', 7)">7 Days</button>
                <button class="period-btn" onclick="updateSalesView(this, '${model}', 14)">2 Weeks</button>
                <button class="period-btn" onclick="updateSalesView(this, '${model}', 30)">1 Month</button>
            </div>
            
            <div id="salesDataContent" class="sales-data-display">
                <span class="sales-number">${getSalesForPeriod(model, 1)}</span>
                <span class="sales-unit">units</span>
            </div>
            
            <button class="sales-close-btn" onclick="closeSalesDialog(this)">Close</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

// Update Sales View
function updateSalesView(btn, model, days) {
    // Update button states
    btn.parentElement.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    const content = document.getElementById('salesDataContent');
    const units = getSalesForPeriod(model, days);
    content.innerHTML = `
        <span class="sales-number">${units}</span>
        <span class="sales-unit">units</span>
    `;
}

// Get Sales For Period
function getSalesForPeriod(model, days) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of day
    
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0); // Start of day
    
    let totalUnits = 0;
    salesHistory.forEach(sale => {
        const saleDate = new Date(sale.date + 'T12:00:00'); // Add time to avoid timezone issues
        
        if (saleDate >= startDate && saleDate <= endDate) {
            // 遍历sale.items数组
            sale.items.forEach(item => {
                if (item.model === model) {
                    totalUnits += item.quantity;
                }
            });
        }
    });
    
    return totalUnits;
}

// Close Sales Dialog
function closeSalesDialog(btn) {
    const dialog = btn.closest('.sales-popup-overlay');
    dialog.remove();
}

// Export Product Data
function exportProductData() {
    const data = [];
    
    models.forEach(model => {
        const attrs = productAttributes[model] || { status: 'usual', category: 'non-push' };
        const price = productPrices[model] || 0;
        const safetyStock = inventoryData[model]?.safetyStock || 20;
        const sales1D = getSalesForPeriod(model, 1);
        
        data.push({
            Model: model,
            Price: price,
            Status: attrs.status === 'usual' ? 'Usual' : 'Clean',
            Category: attrs.category === 'push' ? 'Push' : 'Non-Push',
            'Sales (1D)': sales1D,
            'Safety Stock': safetyStock
        });
    });
    
    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Load price table
function loadPriceTable() {
    const priceTableBody = document.getElementById('priceTableBody');
    if (!priceTableBody) return;

    // Clear table
    priceTableBody.innerHTML = '';

    // Add rows for each model
    models.forEach(model => {
        const price = productPrices[model] || 0;
        const hasPrice = price > 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 500;">${model}</td>
            <td>
                <input type="number"
                       class="price-input-field"
                       value="${price}"
                       min="0"
                       step="100"
                       data-model="${model}"
                       data-original="${price}"
                       onchange="onPriceChange(this)"
                       oninput="onPriceInput(this)">
            </td>
            <td>
                ${hasPrice ?
                    `<button class="delete-model-btn" onclick="clearPrice('${model}')" title="Clear price">
                        <span class="material-icons">delete</span>
                    </button>` :
                    `<span class="price-status not-set">Not Set</span>`
                }
            </td>
        `;

        priceTableBody.appendChild(row);
    });
}

// Update product attribute from table
function updateTableAttribute(model, attribute, checked) {
    if (!productAttributes[model]) {
        productAttributes[model] = { status: 'usual', category: 'non-push' };
    }

    if (attribute === 'status') {
        productAttributes[model].status = checked ? 'clean' : 'usual';
    } else if (attribute === 'category') {
        productAttributes[model].category = checked ? 'push' : 'non-push';
    }

    // Update the label text in the table
    const row = event.target.closest('tr');
    if (row) {
        const labelSpan = event.target.closest('div').querySelector('.toggle-label');
        if (labelSpan) {
            if (attribute === 'status') {
                labelSpan.textContent = checked ? 'Clean' : 'Usual';
            } else if (attribute === 'category') {
                labelSpan.textContent = checked ? 'Push' : 'Non-Push';
            }
        }
    }

    saveProductAttributes();

    // Update structure products if category changed
    if (attribute === 'category') {
        loadMonthData();
    }
}

// Delete model from table
function deleteModel(model) {
    if (!confirm(`Are you sure you want to delete model ${model}? This will remove all inventory and sales data for this model.`)) {
        return;
    }

    // Remove from models array
    const index = models.indexOf(model);
    if (index > -1) {
        models.splice(index, 1);
    }

    // Remove inventory data
    delete inventoryData[model];

    // Remove product attributes
    delete productAttributes[model];

    // Remove price
    delete productPrices[model];

    // Remove sales history for this model
    salesHistory = salesHistory.filter(sale => sale.model !== model);

    // Save all data
    saveData();
    saveProductAttributes();
    saveProductPrices();

    // Reload pages
    loadPersonalPage();
    loadPriceTable();  // Also reload price table
    renderInventoryTable();
    if (currentTab) {
        showSalesView(currentTab);
    }

    showAlert(`Model ${model} deleted successfully`, 'Success', 'check_circle');
}

// Show add model dialog
function showAddModelDialog() {
    const dialog = document.getElementById('addModelDialog');
    dialog.classList.add('show');
    document.getElementById('newModelInput').value = '';
    document.getElementById('newModelInput').focus();
}

// Close add model dialog
function closeAddModelDialog() {
    const dialog = document.getElementById('addModelDialog');
    dialog.classList.remove('show');
}

// Add new model
function addNewModel() {
    const input = document.getElementById('newModelInput');
    const newModel = input.value.trim().toUpperCase();

    if (!newModel) {
        showAlert('Please enter a model name', 'Error', 'error');
        return;
    }

    // Check if model already exists
    if (models.includes(newModel)) {
        showAlert('This model already exists', 'Error', 'error');
        return;
    }

    // Add to models array
    models.push(newModel);
    models.sort();

    // Initialize inventory data for new model
    if (!inventoryData[newModel]) {
        inventoryData[newModel] = {
            stock: 0,
            safetyStock: 0
        };
    }

    // Initialize product attributes
    if (!productAttributes[newModel]) {
        productAttributes[newModel] = {
            status: 'usual',
            category: 'non-push'
        };
    }

    // Initialize price
    if (!productPrices[newModel]) {
        productPrices[newModel] = 0;
    }

    // Save all data
    saveData();
    saveProductAttributes();
    saveProductPrices();

    // Update the form select if called from form context
    if (window.currentModelSelect) {
        // Refresh ALL select dropdowns in the forms
        const allSelects = document.querySelectorAll('.model-select');
        allSelects.forEach(select => {
            const currentValue = select.value;

            // Rebuild options for each select
            select.innerHTML = `
                <option value="">Select Product Model</option>
                ${models.map(model => `<option value="${model}">${model}</option>`).join('')}
                <option value="__ADD_NEW__" style="font-weight: 600; color: #8B5CF6;">+ Add New Model</option>
            `;

            // Restore previous value if it wasn't the add new option
            if (currentValue && currentValue !== '__ADD_NEW__') {
                select.value = currentValue;
            } else if (select === window.currentModelSelect) {
                // Select the newly added model for the dropdown that initiated the add
                select.value = newModel;
            }
        });

        // Trigger change event if needed for the initiating select
        if (window.currentModelContext === 'update' && window.currentModelSelect) {
            updateStockPlaceholder(window.currentModelSelect);
        }

        // Clear the reference
        window.currentModelSelect = null;
        window.currentModelContext = null;
    } else {
        // Called from Personal page - reload both tables
        loadPersonalPage();
        // Specifically reload price table to show new model
        loadPriceTable();
    }

    // Update inventory table if visible
    renderInventoryTable();

    // Close dialog
    closeAddModelDialog();

    // Show success message
    showAlert(`Model ${newModel} added successfully`, 'Success', 'check_circle');
}


// Handle price input changes
function onPriceInput(input) {
    const originalValue = input.dataset.original;
    if (input.value !== originalValue) {
        input.classList.add('modified');
        document.querySelector('.save-prices-btn').style.display = 'flex';
    } else {
        input.classList.remove('modified');

        // Check if any other prices are modified
        const anyModified = document.querySelectorAll('.price-input-field.modified').length > 0;
        if (!anyModified) {
            document.querySelector('.save-prices-btn').style.display = 'none';
        }
    }
}

// Handle price change (when user finishes editing)
function onPriceChange(input) {
    const model = input.dataset.model;
    const price = parseFloat(input.value) || 0;

    // Update status column
    const row = input.closest('tr');
    const statusCell = row.cells[2];

    if (price > 0) {
        statusCell.innerHTML = `
            <button class="delete-model-btn" onclick="clearPrice('${model}')" title="Clear price">
                <span class="material-icons">delete</span>
            </button>
        `;
    } else {
        statusCell.innerHTML = `<span class="price-status not-set">Not Set</span>`;
    }
}

// Clear price for a model
function clearPrice(model) {
    // Set price to 0
    productPrices[model] = 0;

    // Find the row and update input
    const priceInputs = document.querySelectorAll('.price-input-field');
    priceInputs.forEach(input => {
        if (input.dataset.model === model) {
            input.value = 0;
            input.dataset.original = 0;

            // Update status cell
            const row = input.closest('tr');
            const statusCell = row.cells[2];
            statusCell.innerHTML = `<span class="price-status not-set">Not Set</span>`;
        }
    });

    // Save changes
    saveProductPrices();

    // Show feedback
    showAlert(`Price cleared for ${model}`, 'Success', 'check_circle');
}

// Save price changes
function savePriceChanges() {
    const modifiedInputs = document.querySelectorAll('.price-input-field.modified');

    modifiedInputs.forEach(input => {
        const model = input.dataset.model;
        const price = parseFloat(input.value) || 0;

        productPrices[model] = price;

        // Update original value
        input.dataset.original = price;
        input.classList.remove('modified');
    });

    // Save to localStorage
    saveProductPrices();

    // Hide save button
    document.querySelector('.save-prices-btn').style.display = 'none';

    // Show success message
    showAlert('Prices updated successfully!', 'Success', 'check_circle');

    // Update month data if needed
    if (currentTab === 'month') {
        loadMonthData();
    }
}

// This function is now replaced by the table version above
function editPrices() {
    // Deprecated - now using inline table editing
    return;
}

// Old modal-based price editing (deprecated)
function editPricesOld() {
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

    const isDefault = safetyStockDays === 9;

    const dialogContent = `
        <div class="alert-dialog" style="max-width: 400px;">
            <div class="alert-icon">
                <span class="material-icons">warning</span>
            </div>

            <div class="alert-content">
                <h3 class="alert-title">Safety Stock Settings</h3>
                <p class="alert-message" style="margin-bottom: 20px;">Configure calculation period for safety stock and sales data</p>

                <!-- Option Selection -->
                <div style="margin-bottom: 16px;">
                    <!-- Default Option -->
                    <label style="display: flex; align-items: center; padding: 12px; background: ${isDefault ? '#F3F0FF' : 'transparent'}; border: 2px solid ${isDefault ? '#8B5CF6' : '#E5E7EB'}; border-radius: 8px; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio"
                               name="safety-stock-mode"
                               value="default"
                               ${isDefault ? 'checked' : ''}
                               onchange="toggleSafetyStockMode('default')"
                               style="margin-right: 10px;">
                        <div>
                            <div style="font-weight: 500; color: #1F2937;">Default (9 days)</div>
                        </div>
                    </label>

                    <!-- Custom Option -->
                    <label style="display: flex; align-items: center; padding: 12px; background: ${!isDefault ? '#F3F0FF' : 'transparent'}; border: 2px solid ${!isDefault ? '#8B5CF6' : '#E5E7EB'}; border-radius: 8px; cursor: pointer;">
                        <input type="radio"
                               name="safety-stock-mode"
                               value="custom"
                               ${!isDefault ? 'checked' : ''}
                               onchange="toggleSafetyStockMode('custom')"
                               style="margin-right: 10px;">
                        <div>
                            <div style="font-weight: 500; color: #1F2937;">Custom</div>
                        </div>
                    </label>
                </div>

                <!-- Custom Days Input -->
                <div id="customDaysInput" style="display: ${!isDefault ? 'block' : 'none'}; margin-top: 12px;">
                    <input type="number"
                           id="safety-stock-days"
                           class="form-input"
                           value="${!isDefault ? safetyStockDays : ''}"
                           placeholder="Enter days (1-30)"
                           min="1"
                           max="30"
                           step="1"
                           style="width: 100%; padding: 10px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px;">
                </div>
            </div>

            <div class="alert-actions">
                <button class="alert-button secondary" onclick="closeSafetyStockModal()">Cancel</button>
                <button class="alert-button primary" onclick="saveSafetyStockDays()">Save</button>
            </div>
        </div>
    `;

    modal.innerHTML = dialogContent;
    modal.id = 'safetyStockModal';
    document.body.appendChild(modal);
}

// Toggle between default and custom safety stock modes
function toggleSafetyStockMode(mode) {
    const customInput = document.getElementById('customDaysInput');
    const daysInput = document.getElementById('safety-stock-days');
    const radios = document.querySelectorAll('input[name="safety-stock-mode"]');

    if (mode === 'default') {
        customInput.style.display = 'none';
        if (daysInput) {
            daysInput.value = '';
        }
        // Update visual selection
        radios.forEach(radio => {
            const label = radio.closest('label');
            if (radio.value === 'default') {
                label.style.background = '#F3F0FF';
                label.style.borderColor = '#8B5CF6';
            } else {
                label.style.background = 'transparent';
                label.style.borderColor = '#E5E7EB';
            }
        });
    } else {
        customInput.style.display = 'block';
        if (daysInput && safetyStockDays !== 9) {
            daysInput.value = safetyStockDays;
        }
        // Update visual selection
        radios.forEach(radio => {
            const label = radio.closest('label');
            if (radio.value === 'custom') {
                label.style.background = '#F3F0FF';
                label.style.borderColor = '#8B5CF6';
            } else {
                label.style.background = 'transparent';
                label.style.borderColor = '#E5E7EB';
            }
        });
    }
}

function closeSafetyStockModal() {
    const modal = document.getElementById('safetyStockModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function saveSafetyStockDays() {
    const selectedMode = document.querySelector('input[name="safety-stock-mode"]:checked')?.value;
    let newDays;

    if (selectedMode === 'default') {
        newDays = 9;
    } else {
        const daysInput = document.getElementById('safety-stock-days');
        newDays = parseInt(daysInput.value);

        if (!newDays || newDays < 1 || newDays > 30) {
            showAlert('Please enter a valid number of days (1-30)', 'Invalid Input', 'warning');
            return;
        }
    }

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

        // Update column header and inventory table
        updateSalesColumnHeader();
        renderInventoryTable();

        showAlert(`Safety stock and sales period now set to ${newDays} days`, 'Settings Updated', 'check_circle');
    }

    closeSafetyStockModal();
}

// Custom Date Picker Implementation
class CustomDatePicker {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            maxDate: options.maxDate || new Date(),
            minDate: options.minDate || null,
            defaultDate: options.defaultDate || new Date(),
            onSelect: options.onSelect || (() => {}),
            placeholder: options.placeholder || 'Select date',
            ...options
        };

        this.selectedDate = null;
        this.viewDate = new Date();
        this.isOpen = false;

        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        this.setDate(this.options.defaultDate);
    }

    render() {
        const picker = document.createElement('div');
        picker.className = 'custom-date-picker';
        picker.innerHTML = `
            <div class="date-picker-input" tabindex="0">
                <span class="date-text">${this.options.placeholder}</span>
                <span class="material-icons calendar-icon">event</span>
            </div>
            <div class="date-picker-dropdown">
                <div class="date-picker-header">
                    <button class="date-picker-nav" data-action="prev-month">
                        <span class="material-icons">chevron_left</span>
                    </button>
                    <h3 class="date-picker-title"></h3>
                    <button class="date-picker-nav" data-action="next-month">
                        <span class="material-icons">chevron_right</span>
                    </button>
                </div>
                <div class="date-picker-calendar">
                    <div class="date-picker-weekdays"></div>
                    <div class="date-picker-days"></div>
                </div>
                <div class="date-picker-actions">
                    <button class="date-picker-btn" data-action="today">Today</button>
                    <button class="date-picker-btn" data-action="clear">Clear</button>
                </div>
            </div>
        `;

        this.element.appendChild(picker);

        // Store references to elements
        this.pickerElement = picker;
        this.inputElement = picker.querySelector('.date-picker-input');
        this.dropdownElement = picker.querySelector('.date-picker-dropdown');
        this.titleElement = picker.querySelector('.date-picker-title');
        this.weekdaysElement = picker.querySelector('.date-picker-weekdays');
        this.daysElement = picker.querySelector('.date-picker-days');
        this.dateTextElement = picker.querySelector('.date-text');

        this.renderWeekdays();
        this.renderCalendar();
    }

    bindEvents() {
        // Input click to toggle dropdown
        this.inputElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Keyboard support for input
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Navigation buttons
        this.dropdownElement.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            e.stopPropagation();

            switch (action) {
                case 'prev-month':
                    this.navigateMonth(-1);
                    break;
                case 'next-month':
                    this.navigateMonth(1);
                    break;
                case 'today':
                    this.selectToday();
                    break;
                case 'clear':
                    this.clear();
                    break;
            }
        });

        // Day selection
        this.daysElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-picker-day') &&
                !e.target.classList.contains('disabled') &&
                !e.target.classList.contains('other-month')) {

                const day = parseInt(e.target.textContent);
                const newDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), day);
                this.selectDate(newDate);
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.pickerElement.contains(e.target)) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    renderWeekdays() {
        this.weekdaysElement.innerHTML = this.dayNames
            .map(day => `<div class="date-picker-weekday">${day}</div>`)
            .join('');
    }

    renderCalendar() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        // Update title
        this.titleElement.textContent = `${this.monthNames[month]} ${year}`;

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Get previous month days to show
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const todayDate = today.getDate();

        let daysHTML = '';

        // Previous month days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            daysHTML += `<button class="date-picker-day other-month">${day}</button>`;
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const classes = ['date-picker-day'];

            // Check if disabled (future date or before min date)
            if (this.isDateDisabled(currentDate)) {
                classes.push('disabled');
            }

            // Check if today
            if (isCurrentMonth && day === todayDate) {
                classes.push('today');
            }

            // Check if selected
            if (this.selectedDate &&
                this.selectedDate.getFullYear() === year &&
                this.selectedDate.getMonth() === month &&
                this.selectedDate.getDate() === day) {
                classes.push('selected');
            }

            daysHTML += `<button class="date-picker-day ${classes.join(' ')}">${day}</button>`;
        }

        // Next month days to fill the grid
        const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);

        for (let day = 1; day <= remainingCells; day++) {
            daysHTML += `<button class="date-picker-day other-month">${day}</button>`;
        }

        this.daysElement.innerHTML = daysHTML;
    }

    isDateDisabled(date) {
        // Disable future dates if maxDate is set
        if (this.options.maxDate && date > this.options.maxDate) {
            return true;
        }

        // Disable dates before minDate if set
        if (this.options.minDate && date < this.options.minDate) {
            return true;
        }

        return false;
    }

    navigateMonth(direction) {
        this.viewDate.setMonth(this.viewDate.getMonth() + direction);
        this.renderCalendar();
    }

    selectDate(date) {
        if (this.isDateDisabled(date)) return;

        this.selectedDate = new Date(date);
        this.updateDisplay();
        this.renderCalendar();
        this.close();

        // Trigger callback
        this.options.onSelect(this.selectedDate);
    }

    selectToday() {
        const today = new Date();
        if (!this.isDateDisabled(today)) {
            this.selectDate(today);
        }
    }

    clear() {
        this.selectedDate = null;
        this.updateDisplay();
        this.renderCalendar();
        this.close();

        // Trigger callback with null
        this.options.onSelect(null);
    }

    setDate(date) {
        if (date) {
            this.selectedDate = new Date(date);
            this.viewDate = new Date(date);
        } else {
            this.selectedDate = null;
            this.viewDate = new Date();
        }

        this.updateDisplay();
        this.renderCalendar();
    }

    updateDisplay() {
        if (this.selectedDate) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            this.dateTextElement.textContent = this.selectedDate.toLocaleDateString('en-US', options);
        } else {
            this.dateTextElement.textContent = this.options.placeholder;
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.dropdownElement.classList.add('open');

        // On mobile, also show overlay
        if (window.innerWidth <= 480) {
            const overlay = document.createElement('div');
            overlay.className = 'date-picker-overlay open';
            overlay.addEventListener('click', () => this.close());
            document.body.appendChild(overlay);
            this.overlay = overlay;
        }
    }

    close() {
        this.isOpen = false;
        this.dropdownElement.classList.remove('open');

        // Remove mobile overlay
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    getValue() {
        return this.selectedDate ? this.selectedDate.toISOString().split('T')[0] : '';
    }

    destroy() {
        if (this.overlay) {
            this.overlay.remove();
        }
        this.pickerElement.remove();
    }
}

// Global date picker instances
const datePickers = {};

// Initialize custom date pickers
function initCustomDatePickers() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomDatePickers);
        return;
    }

    const today = new Date();

    // Initialize update date picker
    const updateDateContainer = document.getElementById('updateDate');
    if (updateDateContainer && updateDateContainer.type === 'date' && !datePickers.updateDate) {
        const parent = updateDateContainer.parentElement;
        const wrapper = document.createElement('div');
        parent.insertBefore(wrapper, updateDateContainer);
        updateDateContainer.style.display = 'none';

        datePickers.updateDate = new CustomDatePicker(wrapper, {
            maxDate: today,
            defaultDate: today,
            placeholder: 'Select update date',
            onSelect: (date) => {
                updateDateContainer.value = date ? date.toISOString().split('T')[0] : '';
            }
        });
    }

    // Initialize sales date picker
    const salesDateContainer = document.getElementById('salesDate');
    if (salesDateContainer && salesDateContainer.type === 'date' && !datePickers.salesDate) {
        const parent = salesDateContainer.parentElement;
        const wrapper = document.createElement('div');
        parent.insertBefore(wrapper, salesDateContainer);
        salesDateContainer.style.display = 'none';

        datePickers.salesDate = new CustomDatePicker(wrapper, {
            maxDate: today,
            defaultDate: today,
            placeholder: 'Select sales date',
            onSelect: (date) => {
                salesDateContainer.value = date ? date.toISOString().split('T')[0] : '';
            }
        });
    }

    // Initialize selected date picker (for sales analytics)
    const selectedDateContainer = document.getElementById('selectedDate');
    if (selectedDateContainer && selectedDateContainer.type === 'date' && !datePickers.selectedDate) {
        const parent = selectedDateContainer.parentElement;
        const wrapper = document.createElement('div');
        parent.insertBefore(wrapper, selectedDateContainer);
        selectedDateContainer.style.display = 'none';

        datePickers.selectedDate = new CustomDatePicker(wrapper, {
            maxDate: today,
            defaultDate: today,
            placeholder: 'Select date',
            onSelect: (date) => {
                if (date) {
                    selectedDateContainer.value = date.toISOString().split('T')[0];
                    selectedSalesDate = new Date(date);
                    updateDateDisplay();
                    loadTodayData();
                }
            }
        });
    }
}

// Update the setDefaultDates function to work with custom date pickers
function setDefaultDatesCustom() {
    const today = new Date();

    // Set default dates for custom date pickers
    if (datePickers.updateDate) {
        datePickers.updateDate.setDate(today);
    }

    if (datePickers.salesDate) {
        datePickers.salesDate.setDate(today);
    }

    if (datePickers.selectedDate) {
        datePickers.selectedDate.setDate(today);
    }

    // Also update the hidden native inputs
    const todayString = today.toISOString().split('T')[0];
    const updateDateInput = document.getElementById('updateDate');
    const salesDateInput = document.getElementById('salesDate');
    const selectedDateInput = document.getElementById('selectedDate');

    if (updateDateInput) updateDateInput.value = todayString;
    if (salesDateInput) salesDateInput.value = todayString;
    if (selectedDateInput) selectedDateInput.value = todayString;
}

// Custom Date Query Function
function executeCustomQuery() {
    // Use the query date variables directly
    const startDate = new Date(queryStartDate);
    const endDate = new Date(queryEndDate);
    endDate.setHours(23, 59, 59, 999);

    // Validate date range
    if (startDate > endDate) {
        showAlert('Start date must be before or equal to end date', 'Invalid Date Range', 'warning');
        return;
    }

    // Filter sales history for the selected date range
    const filteredSales = salesHistory.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
    });

    // Calculate totals
    let totalUnits = 0;
    let totalRevenue = 0;
    const productSummary = {};

    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            totalUnits += item.quantity;
            const price = productPrices[item.model] || 0;
            const itemRevenue = item.quantity * price;
            totalRevenue += itemRevenue;

            // Aggregate by product
            if (!productSummary[item.model]) {
                productSummary[item.model] = {
                    units: 0,
                    revenue: 0
                };
            }
            productSummary[item.model].units += item.quantity;
            productSummary[item.model].revenue += itemRevenue;
        });
    });

    // Update UI
    document.getElementById('queryTotalSales').textContent = totalUnits;
    document.getElementById('queryTotalRevenue').textContent = `ZAR ${totalRevenue.toLocaleString()}`;

    // Update breakdown table
    const breakdownBody = document.getElementById('queryBreakdownBody');
    breakdownBody.innerHTML = '';

    // Sort products by units sold (descending)
    const sortedProducts = Object.entries(productSummary)
        .sort((a, b) => b[1].units - a[1].units);

    if (sortedProducts.length === 0) {
        breakdownBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: #9CA3AF;">No sales data for selected period</td>
            </tr>
        `;
    } else {
        sortedProducts.forEach(([model, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${model}</td>
                <td>${data.units}</td>
                <td>ZAR ${data.revenue.toLocaleString()}</td>
            `;
            breakdownBody.appendChild(row);
        });
    }

    // Show results section
    document.getElementById('queryResults').style.display = 'block';

    // Set date display
    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedStartDate = startDate.toLocaleDateString('en-US', dateOptions);
    const formattedEndDate = endDate.toLocaleDateString('en-US', dateOptions);

    const resultsTitle = document.querySelector('.results-title');
    if (resultsTitle) {
        if (startDate.toDateString() === endDate.toDateString()) {
            resultsTitle.textContent = `Query Results: ${formattedStartDate}`;
        } else {
            resultsTitle.textContent = `Query Results: ${formattedStartDate} - ${formattedEndDate}`;
        }
    }
}

// Initialize date input for query
function initializeDateQuery() {
    const today = new Date();
    
    // Initialize the date variables
    queryStartDate = new Date(today);
    queryEndDate = new Date(today);
    
    // Initialize custom date pickers for query dates
    const startDateContainer = document.getElementById('queryStartDatePicker');
    const endDateContainer = document.getElementById('queryEndDatePicker');
    
    if (startDateContainer && !datePickers.queryStartDate) {
        datePickers.queryStartDate = new CustomDatePicker(startDateContainer, {
            maxDate: today,
            defaultDate: queryStartDate,
            placeholder: 'Select start date',
            onSelect: (date) => {
                if (date) {
                    queryStartDate = new Date(date);
                    // Ensure end date is not before start date
                    if (queryEndDate < queryStartDate) {
                        queryEndDate = new Date(queryStartDate);
                        datePickers.queryEndDate.setDate(queryEndDate);
                    }
                }
            }
        });
    }
    
    if (endDateContainer && !datePickers.queryEndDate) {
        datePickers.queryEndDate = new CustomDatePicker(endDateContainer, {
            maxDate: today,
            defaultDate: queryEndDate,
            placeholder: 'Select end date',
            onSelect: (date) => {
                if (date) {
                    // Ensure end date is not before start date
                    if (date < queryStartDate) {
                        showAlert('End date cannot be before start date', 'Invalid Date', 'warning');
                        datePickers.queryEndDate.setDate(queryEndDate);
                        return;
                    }
                    queryEndDate = new Date(date);
                }
            }
        });
    }
}

// Initialize custom date picker for query date
function initQueryDatePicker() {
    const today = new Date();

    // Initialize query date picker
    const queryDateContainer = document.getElementById('queryDate');
    if (queryDateContainer && queryDateContainer.type === 'date' && !datePickers.queryDate) {
        const parent = queryDateContainer.parentElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'query-date-wrapper';
        parent.insertBefore(wrapper, queryDateContainer);
        queryDateContainer.style.display = 'none';

        datePickers.queryDate = new CustomDatePicker(wrapper, {
            maxDate: today,
            defaultDate: today,
            placeholder: 'Select date',
            onSelect: (date) => {
                queryDateContainer.value = date ? date.toISOString().split('T')[0] : '';
            }
        });
    }
}

// Initialize date pickers when the page loads
// Note: This is also called during DOM initialization and form mode switches

// Custom Date Query date picker variables
let queryStartDate = new Date();
let queryEndDate = new Date();