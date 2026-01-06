Hooks.on('init', () => {
    console.log(`babele | 应用 Babele 初始化补丁`);
    // 修复 Babele 多次初始化的问题
    if (game.babele) {
        patchBabeleInit(game.babele);
    } else {
        Hooks.once('babele.init', (babele) => patchBabeleInit(babele));
    }
});

function patchBabeleInit(babele) {
    if (babele._patchedInit) return;
    babele._patchedInit = true;
    // 保存原始方法
    const originalInit = babele.init.bind(babele);
    let initPromise = null;
    babele.init = function() {
        // 检查是否完成初始化
        if (this.initialized) return Promise.resolve();
        // 检查是否正在初始化
        if (initPromise) return initPromise;
        // 初始化
        initPromise = originalInit();
        return initPromise;
    };
}