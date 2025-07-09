// Default configuration for flipbook
const defaultConfig = {
    lightBox: true,
    layout: 3,
    currentPage: { vAlign: "bottom", hAlign: "left" },
    btnShare: { enabled: false, hideOnMobile: true },
    btnPrint: {
        enabled: false,
        hideOnMobile: true
    },
    btnDownloadPages: {
        enabled: false,
        hideOnMobile: true
    },
    btnDownloadPdf: {
        enabled: false,
        hideOnMobile: true
    },
    btnColor: 'rgb(255,120,60)',
    sideBtnColor: 'rgb(255,120,60)',
    sideBtnSize: 30,
    sideBtnBackground: "rgba(0,0,0,.7)",
    sideBtnRadius: 30,
    btnSound: { vAlign: "top", hAlign: "left" },
    btnAutoplay: { vAlign: "top", hAlign: "left" }
};

// Function to get query parameters
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Function to initialize flipbook with a specific PDF
function initFlipbook(elementId, pdfUrl, customConfig = {}, showAlert = false) {
    console.log("initFlipbook", elementId, pdfUrl, customConfig, showAlert);
    const isPremiumPurchased = getQueryParam("isPremiumPurchased") || "false";
    const isWeb = getQueryParam("isWeb") || "true";
    
    // All premium game IDs (automatically include all IDs that start with "premium-")
    const isPremiumBook = elementId.startsWith("premium-");
    
    // Hide premium games if web and not in allowed games
    if (isWeb === "true" && isPremiumBook) {
        $(`#${elementId}`).hide();
        return;
    }

    // Merge default config with custom config
    const config = {
        ...defaultConfig,
        ...customConfig,
        pdfUrl: pdfUrl
    };

    if (isPremiumPurchased === "true" || !isPremiumBook) {
        // Initialize flipbook for free books or when premium is purchased
        if (!showAlert) {
            $(`#${elementId}`).flipBook(config);
        }
    } else {
        // Premium book but premium not purchased
        if (showAlert) {
            console.log("Premium not purchased"); // For Flutter app communication
        }
    }
}

// Example usage:
// initFlipbook('waiting-for-fathers-return', 'pdf/waiting-for-fathers-return.pdf');
// initFlipbook('another-book', 'pdf/another-book.pdf', { layout: 2 }); 