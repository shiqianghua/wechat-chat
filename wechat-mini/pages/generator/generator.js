const parser = require('../../utils/parser.js');

Page({
  data: {
    mode: 'text',
    cfgTitle: '微信聊天', cfgTime: '14:30',
    cfgLeftAvatar: '💁', cfgRightAvatar: '👨',
    chatInput: '',
    messages: [], revealOrder: [], revealCounter: 0,
    isPlaying: false, visibleMessages: [],
    leftStats: '0/0', rightStats: '0/0',
    progress: 0, shownCount: 0, totalCount: 0,
    shotGroups: [], activeShotGroup: null,
    shotCurrent: null, shotRevealIdx: 0,
    SHOT_MSG_HEIGHT: 50, shotImgSrc: '', shotScrollOffset: 0,
    sessions: [], currentSessionId: null,
    sessionNames: [], currentSessionName: '',
    backendUrl: ''
  },

  onLoad() {
    this.loadFromStorage();
    this.updateSessionList();
  },

  loadFromStorage() {
    const app = getApp();
    const sessions = app.globalData.sessions || [];
    const shotGroups = app.globalData.shotGroups || [];
    const activeShotGroup = app.globalData.activeShotGroup || null;
    const backendUrl = app.globalData.backendUrl || '';
    this.setData({
      sessions, shotGroups,
      activeShotGroup: activeShotGroup || (shotGroups.length ? shotGroups[0].name : null),
      backendUrl
    });
    if (sessions.length > 0) {
      sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      this.restoreSession(sessions[0]);
    }
  },

  restoreSession(session) {
    if (!session) return;
    this.setData({
      currentSessionId: session.id,
      cfgTitle: session.config ? session.config.title || '微信聊天' : '微信聊天',
      cfgTime: session.config ? session.config.time || '14:30' : '14:30',
      cfgLeftAvatar: session.config ? session.config.leftAvatar || '💁' : '💁',
      cfgRightAvatar: session.config ? session.config.rightAvatar || '👨' : '👨',
      chatInput: session.content || '',
      currentSessionName: session.name || ''
    });
    const msgs = parser.parseChat(session.content || '');
    const ro = (session.revealOrder && session.revealOrder.length === msgs.length)
      ? session.revealOrder.slice() : new Array(msgs.length).fill(0);
    this.setData({
      messages: msgs, revealOrder: ro,
      revealCounter: session.revealCounter || 0, isPlaying: true
    });
    this.renderPlayback();
    this.updateStats();
  },

  saveToStorage() {
    const app = getApp();
    const session = {
      id: this.data.currentSessionId || parser.generateId(),
      name: this.data.cfgTitle || '微信聊天', createdAt: Date.now(),
      config: { title: this.data.cfgTitle, time: this.data.cfgTime,
        leftAvatar: this.data.cfgLeftAvatar, rightAvatar: this.data.cfgRightAvatar },
      content: this.data.chatInput,
      revealOrder: this.data.revealOrder, revealCounter: this.data.revealCounter
    };
    const sessions = app.globalData.sessions || [];
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session; else sessions.push(session);
    app.globalData.sessions = sessions;
    app.globalData.currentSessionId = session.id;
    app.saveAllData();
    this.updateSessionList();
  },

  updateSessionList() {
    const sessions = getApp().globalData.sessions || [];
    this.setData({ sessionNames: sessions.map(s => s.name || '未命名') });
  },

  onSessionSelect(e) {
    const sessions = getApp().globalData.sessions || [];
    const idx = e.detail.value;
    if (idx >= 0 && idx < sessions.length) this.restoreSession(sessions[idx]);
  },

  saveSession() {
    if (!this.data.currentSessionId) { this.newSession(); return; }
    this.saveToStorage();
    wx.showToast({ title: '已保存', icon: 'success', duration: 1500 });
  },

  newSession() {
    const id = parser.generateId();
    this.setData({
      currentSessionId: id, chatInput: '',
      messages: [], revealOrder: [], revealCounter: 0,
      visibleMessages: [], isPlaying: false,
      shownCount: 0, totalCount: 0, progress: 0
    });
    this.saveToStorage();
    wx.showToast({ title: '已创建', icon: 'success', duration: 1500 });
  },

  deleteSession() {
    if (!this.data.currentSessionId) return;
    wx.showModal({
      title: '确认删除', content: '确定删除当前会话？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.sessions = (app.globalData.sessions || [])
            .filter(s => s.id !== this.data.currentSessionId);
          app.saveAllData();
          this.setData({ currentSessionId: null, chatInput: '', messages: [], visibleMessages: [] });
          this.updateSessionList();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  switchMode(e) { this.setData({ mode: e.currentTarget.dataset.mode }); },
  onCfgInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  onBackendInput(e) { this.setData({ backendUrl: e.detail.value }); },

  onBackendBlur() {
    getApp().globalData.backendUrl = this.data.backendUrl;
    getApp().saveAllData();
  },

  // ====== Text Playback ======
  renderPlayback() {
    const { messages, revealOrder } = this.data;
    const visible = [];
    for (let i = 0; i < messages.length; i++) {
      if (revealOrder[i] > 0) visible.push({ ...messages[i], index: i });
    }
    this.setData({ visibleMessages: visible });
  },

  updateStats() {
    const { messages, revealOrder } = this.data;
    let lt = 0, rt = 0, ls = 0, rs = 0;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].side === 'left') { lt++; if (revealOrder[i] > 0) ls++; }
      else if (messages[i].side === 'right') { rt++; if (revealOrder[i] > 0) rs++; }
    }
    const shown = revealOrder.filter(v => v > 0).length;
    this.setData({
      leftStats: ls + '/' + lt, rightStats: rs + '/' + rt,
      shownCount: shown, totalCount: messages.length,
      progress: messages.length ? Math.round(shown / messages.length * 100) : 0
    });
  },

  revealNext(side) {
    if (!this.data.isPlaying) return;
    const { messages, revealOrder, revealCounter } = this.data;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].side === side && revealOrder[i] === 0) {
        const newOrder = [...revealOrder]; newOrder[i] = revealCounter + 1;
        this.setData({ revealOrder: newOrder, revealCounter: revealCounter + 1 });
        this.renderPlayback(); this.updateStats();
        return;
      }
    }
    wx.showToast({ title: '无更多消息', icon: 'none', duration: 1500 });
  },

  revealLeft() { this.revealNext('left'); },
  revealRight() { this.revealNext('right'); },

  autoPlayText() {
    const { messages, revealOrder, revealCounter } = this.data;
    for (let i = 0; i < messages.length; i++) {
      if (revealOrder[i] === 0 && messages[i].side) {
        const newOrder = [...revealOrder]; newOrder[i] = revealCounter + 1;
        this.setData({ revealOrder: newOrder, revealCounter: revealCounter + 1 });
        this.renderPlayback(); this.updateStats();
        return;
      }
    }
    wx.showToast({ title: '对话已全部还原', icon: 'none' });
  },

  undoLast() {
    const { revealOrder, revealCounter, messages } = this.data;
    if (revealCounter <= 0) { wx.showToast({ title: '没有可清除的', icon: 'none' }); return; }
    let maxIdx = -1, maxVal = 0;
    for (let i = 0; i < messages.length; i++) {
      if (revealOrder[i] > maxVal) { maxVal = revealOrder[i]; maxIdx = i; }
    }
    if (maxIdx >= 0) {
      const newOrder = [...revealOrder]; newOrder[maxIdx] = 0;
      const remaining = [];
      for (let j = 0; j < messages.length; j++) {
        if (newOrder[j] > 0) remaining.push(j);
      }
      remaining.sort((a, b) => newOrder[a] - newOrder[b]);
      for (let k = 0; k < remaining.length; k++) newOrder[remaining[k]] = k + 1;
      this.setData({ revealOrder: newOrder, revealCounter: remaining.length });
      this.renderPlayback(); this.updateStats();
    }
  },

  resetAll() {
    const msgs = parser.parseChat(this.data.chatInput);
    this.setData({
      messages: msgs, revealOrder: new Array(msgs.length).fill(0),
      revealCounter: 0, isPlaying: true, visibleMessages: [],
      shownCount: 0, totalCount: msgs.length, progress: 0
    });
    wx.showToast({ title: '已重置', icon: 'success' });
  },

  // ====== Screenshot Mode ======
  uploadToGroup() {
    if (!this.data.activeShotGroup) { wx.showToast({ title: '请先选择分组', icon: 'none' }); return; }
    wx.chooseMedia({
      count: 9, mediaType: ['image'],
      success: (res) => {
        const shotGroups = [...this.data.shotGroups];
        const group = shotGroups.find(g => g.name === this.data.activeShotGroup);
        if (!group) return;
        res.tempFiles.forEach((file) => {
          const fs = wx.getFileSystemManager();
          const data = fs.readFileSync(file.tempFilePath, 'base64');
          group.images.push({
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: 'wx_image', type: 'image',
            data: 'data:image/jpeg;base64,' + data
          });
        });
        this.setData({ shotGroups }); this.saveShotData();
        wx.showToast({ title: '已添加 ' + res.tempFiles.length + ' 张', icon: 'success' });
      }
    });
  },

  newGroup() {
    wx.showModal({
      title: '新建分组', editable: true, placeholderText: '分组名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim();
          const shotGroups = [...this.data.shotGroups];
          if (shotGroups.find(g => g.name === name)) {
            wx.showToast({ title: '分组已存在', icon: 'none' }); return;
          }
          shotGroups.push({ name, images: [], annotations: {} });
          this.setData({ shotGroups, activeShotGroup: name }); this.saveShotData();
        }
      }
    });
  },

  setActiveGroup(e) { this.setData({ activeShotGroup: e.currentTarget.dataset.name }); },

  deleteGroup(e) {
    wx.showModal({
      title: '确认删除', content: '确定删除该分组及所有图片？',
      success: (res) => {
        if (res.confirm) {
          const name = e.currentTarget.dataset.name;
          const shotGroups = this.data.shotGroups.filter(g => g.name !== name);
          const active = this.data.activeShotGroup === name
            ? (shotGroups.length ? shotGroups[0].name : null) : this.data.activeShotGroup;
          this.setData({ shotGroups, activeShotGroup: active }); this.saveShotData();
        }
      }
    });
  },

  selectImage(e) {
    const id = e.currentTarget.dataset.id;
    let img = null;
    for (const g of this.data.shotGroups) { img = g.images.find(i => i.id === id); if (img) break; }
    if (!img) return;
    this.setData({
      shotCurrent: id, shotRevealIdx: img.revealIdx || 0,
      shotImgSrc: img.data || '', shotScrollOffset: (img.revealIdx || 0) * this.data.SHOT_MSG_HEIGHT
    });
  },

  deleteImage(e) {
    wx.showModal({
      title: '确认删除', content: '确定删除该图片？',
      success: (res) => {
        if (res.confirm) {
          const id = e.currentTarget.dataset.id;
          const shotGroups = [...this.data.shotGroups];
          for (const g of shotGroups) {
            const idx = g.images.findIndex(i => i.id === id);
            if (idx >= 0) { g.images.splice(idx, 1); break; }
          }
          this.setData({
            shotGroups,
            shotCurrent: this.data.shotCurrent === id ? null : this.data.shotCurrent
          });
          this.saveShotData();
        }
      }
    });
  },

  autoPlayShot() {
    if (!this.data.shotCurrent) { wx.showToast({ title: '请先选择一张截图', icon: 'none' }); return; }
    const newIdx = this.data.shotRevealIdx + 1;
    this.setData({
      shotRevealIdx: newIdx,
      shotScrollOffset: newIdx * this.data.SHOT_MSG_HEIGHT
    });
    this.saveShotData();
  },

  undoShot() {
    if (this.data.shotRevealIdx <= 0) return;
    const newIdx = this.data.shotRevealIdx - 1;
    this.setData({
      shotRevealIdx: newIdx,
      shotScrollOffset: newIdx * this.data.SHOT_MSG_HEIGHT
    });
    this.saveShotData();
  },

  onStepChange(e) {
    this.setData({
      SHOT_MSG_HEIGHT: e.detail.value,
      shotScrollOffset: this.data.shotRevealIdx * e.detail.value
    });
  },

  saveShotData() {
    const app = getApp();
    app.globalData.shotGroups = this.data.shotGroups;
    app.globalData.activeShotGroup = this.data.activeShotGroup;
    app.saveAllData();
  },

  syncBackend() {
    if (!this.data.backendUrl) { wx.showToast({ title: '请先设置后端地址', icon: 'none' }); return; }
    wx.request({
      url: this.data.backendUrl.replace(/\/$/, '') + '/api/sync',
      method: 'POST',
      data: { groups: this.data.shotGroups },
      success: () => wx.showToast({ title: '同步成功！', icon: 'success' }),
      fail: (err) => wx.showToast({ title: '同步失败: ' + err.errMsg, icon: 'none' })
    });
  },

  exportImage() {
    wx.showToast({ title: '小程序暂不支持导出，请使用网页版', icon: 'none' });
  }
});
