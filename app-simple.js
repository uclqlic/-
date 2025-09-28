// Simple Inventory Data
let inventoryData = [
    { model: "100Q7800H", stock: 25, safetyStock: 10 },
    { model: "86X8700G", stock: 3, safetyStock: 5 },
    { model: "86X8500G", stock: 15, safetyStock: 8 },
    { model: "75X8700G", stock: 18, safetyStock: 8 },
    { model: "75X8500G", stock: 12, safetyStock: 6 },
    { model: "75Q6600H", stock: 8, safetyStock: 10 },
    { model: "65X8700G", stock: 22, safetyStock: 10 },
    { model: "65X8500G", stock: 32, safetyStock: 15 },
    { model: "65Q6620G", stock: 10, safetyStock: 8 },
    { model: "60Q6600H", stock: 7, safetyStock: 10 },
    { model: "55Q6600H", stock: 0, safetyStock: 12 },
    { model: "43E5520H", stock: 45, safetyStock: 20 },
    { model: "40E5520H", stock: 38, safetyStock: 18 },
    { model: "32E5520H", stock: 52, safetyStock: 25 }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateInventoryTable();
    setupFormHandler();
});

// Update Inventory Table Display
function updateInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';

    inventoryData.forEach(item => {
        const row = document.createElement('tr');
        const statusClass = getStockStatus(item.stock, item.safetyStock);
        const statusText = getStatusText(item.stock, item.safetyStock);

        row.innerHTML = `
            <td>${item.model}</td>
            <td>${item.stock}</td>
            <td><span class="stock-status ${statusClass}">${statusText}</span></td>
        `;

        tableBody.appendChild(row);
    });
}

// Get stock status class
function getStockStatus(stock, safetyStock) {
    if (stock === 0) return 'stock-out';
    if (stock <= safetyStock) return 'stock-low';
    return 'stock-normal';
}

// Get status text
function getStatusText(stock, safetyStock) {
    if (stock === 0) return '缺货';
    if (stock <= safetyStock) return '库存不足';
    return '正常';
}

// Show update form
function showUpdateForm() {
    document.getElementById('updateForm').style.display = 'block';
    document.getElementById('modelSelect').focus();
}

// Hide update form
function hideUpdateForm() {
    document.getElementById('updateForm').style.display = 'none';
    document.getElementById('inventoryUpdateForm').reset();
}

// Setup form submission handler
function setupFormHandler() {
    const form = document.getElementById('inventoryUpdateForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateInventory();
    });
}

// Update inventory function
function updateInventory() {
    const modelSelect = document.getElementById('modelSelect');
    const quantityInput = document.getElementById('quantityInput');

    const selectedModel = modelSelect.value;
    const newQuantity = parseInt(quantityInput.value);

    if (!selectedModel || isNaN(newQuantity) || newQuantity < 0) {
        alert('请选择有效的型号和数量');
        return;
    }

    // Find and update the inventory item
    const itemIndex = inventoryData.findIndex(item => item.model === selectedModel);

    if (itemIndex !== -1) {
        const oldStock = inventoryData[itemIndex].stock;
        inventoryData[itemIndex].stock = newQuantity;

        // Show success message
        showMessage(`${selectedModel} 库存已更新: ${oldStock} → ${newQuantity}`, 'success');

        // Update the table
        updateInventoryTable();

        // Hide form and reset
        hideUpdateForm();
    } else {
        alert('未找到选定的型号');
    }
}

// Export data function (simple CSV export)
function exportData() {
    let csvContent = "型号,库存,安全库存,状态\n";

    inventoryData.forEach(item => {
        const status = getStatusText(item.stock, item.safetyStock);
        csvContent += `${item.model},${item.stock},${item.safetyStock},${status}\n`;
    });

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'inventory_' + new Date().toISOString().split('T')[0] + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showMessage('数据已导出到 CSV 文件', 'success');
    }
}

// Simple message display function
function showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;

    // Style the message
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background-color: ${type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);

    // Show message
    document.body.appendChild(messageEl);

    // Remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close form
    if (e.key === 'Escape') {
        hideUpdateForm();
    }

    // Ctrl/Cmd + U to show update form
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        showUpdateForm();
    }
});

// Add some sample data modification for testing (you can remove this)
window.addTestStock = function(model, quantity) {
    const item = inventoryData.find(item => item.model === model);
    if (item) {
        item.stock += quantity;
        updateInventoryTable();
        showMessage(`已为 ${model} 添加 ${quantity} 件库存`, 'success');
    }
};