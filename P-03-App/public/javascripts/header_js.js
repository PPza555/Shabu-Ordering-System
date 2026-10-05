(function () {
    const urlParams = new URLSearchParams(window.location.search);
    let urlTableId = urlParams.get('table_id');
    let storedTableId = localStorage.getItem('table_id');

    if (urlTableId) {
        if (storedTableId && storedTableId !== urlTableId) {
            // Change the URL to match localStorage
            const newUrl = window.location.pathname + '?table_id=' + storedTableId;
            window.location.replace(newUrl);
            return;
        }
        // If no localStorage, set it to URL value
        if (!storedTableId) {
            localStorage.setItem('table_id', urlTableId);
        }
    } else {
        // If no table_id in URL, use localStorage or default to 0
        if (!storedTableId) {
            storedTableId = '0';
            localStorage.setItem('table_id', storedTableId);
        }
        // Redirect to URL with table_id from localStorage
        const newUrl = window.location.pathname + '?table_id=' + storedTableId;
        window.location.replace(newUrl);
    }
})();

window.tableId = window.tableId || localStorage.getItem('table_id');
document.querySelectorAll('a.nav-link').forEach(link => {
    if (window.tableId && link.href && !link.href.includes('table_id=')) {
        if (link.href.startsWith(window.location.origin)) {
            const url = new URL(link.href);
            url.searchParams.set('table_id', window.tableId);
            link.href = url.toString();
        }
    }
});

window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
        pageLanguage: 'th',
        includedLanguages: 'en,th',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');
};
(function () {
    var script = document.createElement('script');
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
})();