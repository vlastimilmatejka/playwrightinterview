export const mainMenuSelectors = {
    self:"header",
    menuItem :".navbar-nav > li",
    logo:".logo > a > img"
}

export const gdprSelectors = {
    self:".fc-dialog-container",
    agree:".fc-cta-consent",
    manageOptions:".fc-cta-manage-options ",
    acceptAll:".fc-data-preferences-accept-all",
    confirmChoices:".fc-confirm-choices"
}

export const loginSelectors = {
    self:".login-form",
    email:'[data-qa="login-email"]',
    password:'[data-qa="login-password"]',
    button:'[data-qa="login-button"]'
}

export const signUpSelectors = {
    self:".signup-form",
    name:'[data-qa="signup-name"]',
    email:'[data-qa="signup-email"]',
    button:'[data-qa="signup-button"]'
}

export const featureItemsSelectors = {
    self :".features_items",
    itemCard:".col-sm-4",
    addToCartButton:".productinfo > a",
    productHeadline:".productinfo > h2",
    cardDescription:".productinfo > p",
    cardImage:".productinfo > img",
    cardDetail:".choose > ul > li> a"
}

export const cartSelectors = {
    self:"#cart_info_table",
    cartItem:"#cart_info_table > tbody > tr",
    cartColumnsHeader: ".cart_menu > td"
}
