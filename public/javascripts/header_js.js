
// จัดการ table_id
(function () {

    const urlParams = new URLSearchParams(window.location.search);

    const urlTableId = urlParams.get('table_id');
    let storedTableId = localStorage.getItem('table_id');

    // ถ้ามี table_id จาก URL
    if (urlTableId) {

        // ถ้ามี table_id ใน localStorage และไม่ตรงกับ URL
        if (storedTableId && storedTableId !== urlTableId) {

            const newUrl =
                window.location.pathname +
                '?table_id=' +
                encodeURIComponent(storedTableId);

            window.location.replace(newUrl);

            return;
        }

        // ถ้ายังไม่มีใน localStorage ให้บันทึกค่าจาก URL
        if (!storedTableId) {
            localStorage.setItem('table_id', urlTableId);
        }

    } else {

        // ถ้าไม่มี table_id ใน URL และไม่มีใน localStorage
        if (!storedTableId) {

            storedTableId = '0';

            localStorage.setItem(
                'table_id',
                storedTableId
            );
        }

        // เพิ่ม table_id เข้า URL
        const newUrl =
            window.location.pathname +
            '?table_id=' +
            encodeURIComponent(storedTableId);

        window.location.replace(newUrl);
    }

})();

// เก็บ table_id ไว้ใช้งานทั่วเว็บไซต์
window.tableId =
    window.tableId ||
    localStorage.getItem('table_id');

// เพิ่ม table_id ให้ลิงก์ภายในเว็บไซต์
document.querySelectorAll('a').forEach(link => {

    if (
        window.tableId &&
        link.href &&
        link.href.startsWith(window.location.origin)
    ) {

        const url = new URL(link.href);

        // ไม่แก้ลิงก์ที่เป็น #
        if (url.hash === '#') {
            return;
        }

        // เพิ่ม / แก้ table_id
        url.searchParams.set(
            'table_id',
            window.tableId
        );

        link.href = url.toString();
    }

});

// ระบบนับจำนวนสินค้าในตะกร้า
function updateCartCount() {

    const cart =
        JSON.parse(localStorage.getItem('cart')) || [];

    let totalQuantity = 0;

    cart.forEach(item => {
        totalQuantity += Number(item.quantity) || 0;

    });

    const cartCount =
        document.getElementById('cartCount');

    if (cartCount) {
        cartCount.textContent = totalQuantity;

        // ถ้าไม่มีสินค้า
        if (totalQuantity === 0) {
            cartCount.style.display = 'none';

        } else {
            cartCount.style.display = 'flex';

        }

    }

}

// เพิ่มสินค้าเข้าตะกร้า
function addToCart(id, name, price) {

    let cart =
        JSON.parse(localStorage.getItem('cart')) || [];

    const existingItem =
        cart.find(item => item.id == id);

    if (existingItem) {
        existingItem.quantity += 1;

    } else {

        cart.push({
            id: id,
            name: name,
            price: Number(price),
            quantity: 1

        });

    }

    // บันทึกตะกร้า
    localStorage.setItem(
        'cart',
        JSON.stringify(cart)
    );

    // อัปเดตจำนวนบน Navbar
    updateCartCount();

}

// โหลดจำนวนตะกร้าเมื่อเปิดหน้า
document.addEventListener(
    'DOMContentLoaded',
    function () {
        updateCartCount();
    }
);
