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
    const allowedGames = ['Who is Allah?'];
    
    // Get the game title from the element
    const gameTitle = $(`#${elementId}`).find('.game-title').text();
    
    // Hide premium games if not web
    if (isWeb === "true" && allowedGames.includes(gameTitle)) {
        $(`#${elementId}`).hide();
        return;
    }



    // Merge default config with custom config
    const config = {
        ...defaultConfig,
        ...customConfig,
        pdfUrl: pdfUrl
    };

    if (isPremiumPurchased === "true" || !elementId.includes("premium")) {
      // Initialize flipbook
      if(!showAlert){
        $(`#${elementId}`).flipBook(config);
      }

       
   } else {
    if(showAlert){
        console.log("Premium not purchased");
    }

   }

  
}

// Example usage:
// initFlipbook('waiting-for-fathers-return', 'pdf/waiting-for-fathers-return.pdf');
// initFlipbook('another-book', 'pdf/another-book.pdf', { layout: 2 }); 