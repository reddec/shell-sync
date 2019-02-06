/**
 * Save workspace configuration to the localstorage
 * @param configs array of project configuration
 * @param openedConfigNum index of currently opened/last opened project
 */
export function workspaceSave(configs, openedConfigNum) {
    localStorage.setItem('configs', JSON.stringify(configs));
    localStorage.setItem('openedConfigNum', JSON.stringify(openedConfigNum));
}

/**
 * Load workspace configuration from the localstorage
 * @returns {{openedConfigNum: Number, configs: Array}}
 */
export function workspaceLoad() {
    let configs = JSON.parse(localStorage.getItem('configs') || '[]');
    let openedConfigNum = JSON.parse(localStorage.getItem('openedConfigNum') || '0');
    return {configs, openedConfigNum};
}

