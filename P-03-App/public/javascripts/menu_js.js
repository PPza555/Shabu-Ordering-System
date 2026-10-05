document.querySelectorAll('.menu-item-card').forEach(function (card) {
    card.addEventListener('click', function () {
        document.getElementById('menuItemModalLabel').textContent = card.dataset.name;
        document.getElementById('menuItemModalImg').src = card.dataset.img;
        document.getElementById('menuItemModalImg').alt = card.dataset.name;
        document.getElementById('menuItemModalPrice').textContent = card.dataset.price ? 'ราคา: ' + card.dataset.price + ' บาท' : '';
        document.getElementById('menuItemModalQty').value = 1;
        document.getElementById('menuItemModalSize').value = "M";
        document.getElementById('menuItemModalConfirm').dataset.menuId = card.dataset.menuId;
        document.getElementById('menuItemModalPrice').dataset.basePrice = card.dataset.price;
        var modal = new bootstrap.Modal(document.getElementById('menuItemModal'));
        modal.show();
    });
});

const sizeSelect = document.getElementById('menuItemModalSize');
if (sizeSelect) {
    sizeSelect.addEventListener('change', function () {
        const priceTag = document.getElementById('menuItemModalPrice');
        let basePrice = parseFloat(priceTag.dataset.basePrice || "0");
        let displayPrice = basePrice;
        if (this.value === 'L') displayPrice = basePrice * 1.2;
        else if (this.value === 'S') displayPrice = basePrice * 0.8;
        priceTag.textContent = 'ราคา: ' + displayPrice.toLocaleString('en-US', {minimumFractionDigits: 2}) + ' บาท';
    });
}

const qtyIncreaseBtn = document.getElementById('qtyIncrease');
if (qtyIncreaseBtn) {
    qtyIncreaseBtn.onclick = function () {
        const qtyInput = document.getElementById('menuItemModalQty');
        qtyInput.value = parseInt(qtyInput.value) + 1;
    };
}
const qtyDecreaseBtn = document.getElementById('qtyDecrease');
if (qtyDecreaseBtn) {
    qtyDecreaseBtn.onclick = function () {
        const qtyInput = document.getElementById('menuItemModalQty');
        if (parseInt(qtyInput.value) > 1) {
            qtyInput.value = parseInt(qtyInput.value) - 1;
        }
    };
}
const menuItemModalConfirmBtn = document.getElementById('menuItemModalConfirm');
if (menuItemModalConfirmBtn) {
    menuItemModalConfirmBtn.addEventListener('click', function () {
        const qty = parseInt(document.getElementById('menuItemModalQty').value);
        const name = document.getElementById('menuItemModalLabel').textContent;
        const priceText = document.getElementById('menuItemModalPrice').textContent;
        const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
        const img = document.getElementById('menuItemModalImg').src;
        const menu_item_id = this.dataset.menuId;
        const size = document.getElementById('menuItemModalSize').value;

        const existing = cart.find(item => item.menu_item_id === menu_item_id && item.size === size);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ menu_item_id, name, qty, price, img, size });
        }

        saveCart();

        document.activeElement && document.getElementById('menuItemModal').contains(document.activeElement) && document.activeElement.blur();
        bootstrap.Modal.getInstance(document.getElementById('menuItemModal')).hide();
        updateCartWidget();
    });
}

// // =========================================
// // เก็บบันทึกรายการตะกร้า (ตัวอย่างผ่าน LocalStorage)
// let cart = JSON.parse(localStorage.getItem('cart')) || {};

// // อัปเดตการแสดงผลจำนวนของปุ่มบนการ์ดทุกใบเมื่อโหลดหน้า
// document.addEventListener('DOMContentLoaded', () => {
//     updateCardQtyDisplays();
// });

// function changeQty(itemId, change) {
//     if (!cart[itemId]) {
//         cart[itemId] = 0;
//     }
    
//     cart[itemId] += change;
    
//     if (cart[itemId] <= 0) {
//         delete cart[itemId];
//     }
    
//     localStorage.setItem('cart', JSON.stringify(cart));
//     updateCardQtyDisplays();
// }

// function updateCardQtyDisplays() {
//     // อัปเดตตัวเลขในแท็ก <span id="qty-ID">
//     document.querySelectorAll('[id^="qty-"]').forEach(span => {
//         const itemId = span.id.replace('qty-', '');
//         span.textContent = cart[itemId] || 0;
//     });
// }

// function updateCartItem(itemId, quantity) {
//     if (!cart[itemId]) cart[itemId] = 0;
//     cart[itemId] += quantity;
//     localStorage.setItem('cart', JSON.stringify(cart));
//     updateCardQtyDisplays();
// }