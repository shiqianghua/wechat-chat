App({
  globalData: {
    sessions: [],
    currentSessionId: null,
    shotGroups: [],
    activeShotGroup: null,
    shotCurrent: null,
    shotRevealIdx: 0,
    SHOT_MSG_HEIGHT: 50,
    backendUrl: ''
  },

  onLaunch() {
    // Restore data from storage
    this.loadAllData();
  },

  loadAllData() {
    try {
      const sessions = wx.getStorageSync('wxchat_sessions') || [];
      this.globalData.sessions = sessions;

      const shotGroups = wx.getStorageSync('wxchat_shot_groups') || [];
      this.globalData.shotGroups = shotGroups;

      const activeGroup = wx.getStorageSync('wxchat_active_group') || null;
      this.globalData.activeShotGroup = activeGroup;

      const backendUrl = wx.getStorageSync('wxchat_backend_url') || '';
      this.globalData.backendUrl = backendUrl;
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  },

  saveAllData() {
    try {
      wx.setStorageSync('wxchat_sessions', this.globalData.sessions);
      wx.setStorageSync('wxchat_shot_groups', this.globalData.shotGroups);
      wx.setStorageSync('wxchat_active_group', this.globalData.activeShotGroup);
      wx.setStorageSync('wxchat_backend_url', this.globalData.backendUrl);
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  }
});
