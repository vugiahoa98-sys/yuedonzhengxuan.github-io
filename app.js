/**
 * ============================================================
 *  粤东甄选 — 小程序入口文件
 *  职责：全局生命周期、全局数据、授权登录、本地存储初始化
 *  适配：个人主体（不调用 wx.login / wx.requestPayment）
 * ============================================================
 */

// 引入 Mock 数据（首次启动时写入 Storage）
const mockProducts = require('./mock/products');
const mockCategories = require('./mock/categories');
const mockBanners = require('./mock/banners');
const mockCoupons = require('./mock/coupons');
const mockMember = require('./mock/member');
const traceData = require('./mock/trace-data');

App({

  /* ======================== 全局数据 ======================== */
  globalData: {
    // —— 用户信息 ——
    userInfo: null,          // 微信头像昵称
    isLogin: false,

    // —— 会员信息（Mock 预置金卡） ——
    memberLevel: 'gold',     // basic / silver / gold / black
    memberPoints: 2880,
    memberGrowth: 1980,

    // —— 购物车角标计数 ——
    cartCount: 0,

    // —— 设备信息（自定义导航栏适配） ——
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,         // 状态栏 + 导航栏总高度
    menuButtonInfo: null,    // 胶囊按钮位置

    // —— 版本信息 ——
    version: '1.0.0',
    appName: '粤东甄选',
  },

  /* ======================== 生命周期 ======================== */

  /**
   * 小程序启动时执行（全局仅一次）
   */
  onLaunch() {
    console.log('[App] onLaunch — 粤东甄选启动');

    // 1. 获取系统信息，计算导航栏高度
    this._initSystemInfo();

    // 2. 初始化本地存储（首次使用写入 Mock 数据）
    this._initStorage();

    // 3. 尝试从缓存恢复用户登录态
    this._restoreLoginState();

    // 4. 更新购物车角标
    this.updateCartBadge();
  },

  /**
   * 小程序显示（从后台切回前台）
   */
  onShow(options) {
    console.log('[App] onShow — 场景值:', options.scene);
  },

  /**
   * 小程序隐藏（切到后台）
   */
  onHide() {
    console.log('[App] onHide');
  },

  /**
   * 全局错误捕获
   */
  onError(err) {
    console.error('[App] onError:', err);
  },

  /* ======================== 系统信息 ======================== */

  /**
   * 获取设备信息，计算自定义导航栏高度
   * 公式：navBarHeight = statusBarHeight + 44px（导航栏固定高度）
   */
  _initSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();

      this.globalData.systemInfo = systemInfo;
      this.globalData.statusBarHeight = systemInfo.statusBarHeight;
      this.globalData.menuButtonInfo = menuButton;

      // 导航栏高度 = 状态栏高度 + (胶囊底部 - 状态栏高度) + (胶囊顶部 - 状态栏高度)
      // 简化：状态栏 + 44px
      const navBarContentHeight = (menuButton.top - systemInfo.statusBarHeight) * 2 + menuButton.height;
      this.globalData.navBarHeight = systemInfo.statusBarHeight + navBarContentHeight;

      console.log('[App] 系统信息:', {
        platform: systemInfo.platform,
        model: systemInfo.model,
        statusBarHeight: systemInfo.statusBarHeight,
        navBarHeight: this.globalData.navBarHeight,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight,
      });
    } catch (e) {
      console.error('[App] 获取系统信息失败:', e);
      // 降级默认值
      this.globalData.statusBarHeight = 44;
      this.globalData.navBarHeight = 88;
    }
  },

  /* ======================== 本地存储初始化 ======================== */

  /**
   * 首次使用时将 Mock 数据写入本地存储
   * 后续操作直接读写 Storage，模拟后端数据库
   */
  _initStorage() {
    // 标记是否已初始化
    const inited = wx.getStorageSync('_inited');
    if (inited) {
      console.log('[App] Storage 已初始化，跳过');
      return;
    }

    console.log('[App] 首次启动，写入 Mock 数据...');

    // 商品数据
    wx.setStorageSync('products', mockProducts);
    // 分类数据
    wx.setStorageSync('categories', mockCategories);
    // 轮播图
    wx.setStorageSync('banners', mockBanners);
    // 优惠券
    wx.setStorageSync('coupons', mockCoupons);
    // 会员信息
    wx.setStorageSync('member', mockMember);
    // 溯源数据
    wx.setStorageSync('traceData', traceData);

    // 购物车（空数组）
    wx.setStorageSync('cart', []);
    // 收藏（空数组）
    wx.setStorageSync('favorites', []);
    // 订单（空数组）
    wx.setStorageSync('orders', []);
    // 收货地址（预置一条默认地址）
    wx.setStorageSync('addresses', [
      {
        id: 'addr_001',
        name: '王先生',
        phone: '138****8888',
        province: '广东省',
        city: '潮州市',
        district: '湘桥区',
        detail: '凤凰镇茶山路88号',
        isDefault: true,
      }
    ]);

    // 写入初始化标记
    wx.setStorageSync('_inited', true);
    console.log('[App] Mock 数据写入完成');
  },

  /* ======================== 登录与授权 ======================== */

  /**
   * 从缓存恢复登录态
   */
  _restoreLoginState() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLogin = true;
      console.log('[App] 恢复登录态:', userInfo.nickName);
    }
  },

  /**
   * 获取用户信息（个人主体可用）
   * 调用 wx.getUserProfile，需用户手动触发（button 点击）
   * @returns {Promise<Object>} userInfo
   */
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: (res) => {
          const userInfo = res.userInfo;
          this.globalData.userInfo = userInfo;
          this.globalData.isLogin = true;
          wx.setStorageSync('userInfo', userInfo);
          console.log('[App] 授权登录成功:', userInfo.nickName);
          resolve(userInfo);
        },
        fail: (err) => {
          console.warn('[App] 用户拒绝授权:', err);
          reject(err);
        }
      });
    });
  },

  /**
   * 退出登录
   */
  logout() {
    this.globalData.userInfo = null;
    this.globalData.isLogin = false;
    wx.removeStorageSync('userInfo');
    console.log('[App] 已退出登录');
  },

  /* ======================== 购物车管理 ======================== */

  /**
   * 更新 TabBar 购物车角标
   */
  updateCartBadge() {
    const cart = wx.getStorageSync('cart') || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.globalData.cartCount = count;

    // 通知自定义 TabBar 更新（如果已挂载）
    if (typeof this.tabBarPage !== 'undefined' && this.tabBarPage) {
      this.tabBarPage.setData({ cartCount: count });
    }

    console.log('[App] 购物车数量:', count);
  },

  /**
   * 添加商品到购物车
   * @param {Object} product - 商品对象
   * @param {Number} quantity - 数量（默认 1）
   */
  addToCart(product, quantity = 1) {
    let cart = wx.getStorageSync('cart') || [];
    const existIndex = cart.findIndex(item => item.id === product.id);

    if (existIndex > -1) {
      // 已存在，累加数量
      cart[existIndex].quantity += quantity;
    } else {
      // 新增项
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        spec: product.spec,
        image: product.images ? product.images[0] : '',
        quantity: quantity,
        checked: true,
        promotions: product.promotions || [],
        arEnabled: product.arEnabled || false,
      });
    }

    wx.setStorageSync('cart', cart);
    this.updateCartBadge();

    // 震动反馈
    wx.vibrateShort({ type: 'medium' });

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500,
    });

    return cart;
  },

  /* ======================== 收藏管理 ======================== */

  /**
   * 切换收藏状态
   * @param {String} productId
   * @returns {Boolean} 收藏后的状态（true=已收藏）
   */
  toggleFavorite(productId) {
    let favorites = wx.getStorageSync('favorites') || [];
    const index = favorites.indexOf(productId);

    if (index > -1) {
      favorites.splice(index, 1);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      favorites.push(productId);
      wx.vibrateShort({ type: 'light' });
      wx.showToast({ title: '收藏成功', icon: 'success' });
    }

    wx.setStorageSync('favorites', favorites);
    return index === -1; // 返回新状态
  },

  /**
   * 检查是否已收藏
   * @param {String} productId
   * @returns {Boolean}
   */
  isFavorited(productId) {
    const favorites = wx.getStorageSync('favorites') || [];
    return favorites.indexOf(productId) > -1;
  },

  /* ======================== 订单管理 ======================== */

  /**
   * 创建订单（模拟支付成功后调用）
   * @param {Object} orderData - 订单数据
   * @returns {Object} 新订单
   */
  createOrder(orderData) {
    const orders = wx.getStorageSync('orders') || [];
    const now = new Date();

    const order = {
      id: 'ORD' + now.getTime(),
      orderNo: '20240405' + Math.floor(Math.random() * 100000000),
      status: 'paid',  // 模拟已支付 → 待发货
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      discountAmount: orderData.discountAmount || 0,
      shippingFee: orderData.shippingFee || 0,
      addressId: orderData.addressId,
      remark: orderData.remark || '',
      createTime: this.formatTime(now),
      payTime: this.formatTime(now),
      shipTime: '',
    };

    orders.unshift(order);
    wx.setStorageSync('orders', orders);

    // 清空购物车中已购买的商品
    if (orderData.clearCart) {
      wx.setStorageSync('cart', []);
      this.updateCartBadge();
    }

    console.log('[App] 订单创建成功:', order.id);
    return order;
  },

  /* ======================== 工具函数 ======================== */

  /**
   * 格式化时间
   * @param {Date} date
   * @returns {String} YYYY/MM/DD HH:mm
   */
  formatTime(date) {
    const d = date || new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  /**
   * 格式化价格（保留两位小数）
   * @param {Number} price
   * @returns {String}
   */
  formatPrice(price) {
    return parseFloat(price).toFixed(2);
  },

  /**
   * 模拟异步请求（给 Mock 数据加延迟，模拟网络加载）
   * @param {*} data - 要返回的数据
   * @param {Number} delay - 延迟毫秒数
   * @returns {Promise}
   */
  mockRequest(data, delay = 600) {
    return new Promise(resolve => {
      setTimeout(() => resolve(data), delay);
    });
  },

  /**
   * 获取 Mock 商品列表（支持分类筛选、排序）
   * @param {Object} params - { category, sort, page, pageSize }
   * @returns {Promise<Array>}
   */
  getProducts(params = {}) {
    let products = wx.getStorageSync('products') || [];
    const { category, sort, keyword, page = 1, pageSize = 10 } = params;

    // 分类筛选
    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    // 关键词搜索
    if (keyword) {
      const kw = keyword.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        (p.subTitle && p.subTitle.toLowerCase().includes(kw))
      );
    }

    // 排序
    if (sort === 'price-asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'sales') {
      products.sort((a, b) => b.sales - a.sales);
    }

    // 分页
    const start = (page - 1) * pageSize;
    const list = products.slice(start, start + pageSize);
    const hasMore = start + pageSize < products.length;

    return this.mockRequest({ list, hasMore, total: products.length });
  },

  /**
   * 根据 ID 获取单个商品
   * @param {String} productId
   * @returns {Object|null}
   */
  getProductById(productId) {
    const products = wx.getStorageSync('products') || [];
    return products.find(p => p.id === productId) || null;
  },

  /**
   * 获取溯源数据
   * @param {String} traceId
   * @returns {Object|null}
   */
  getTraceData(traceId) {
    const data = wx.getStorageSync('traceData') || {};
    return data[traceId] || null;
  },

  /* ======================== 全局分享 ======================== */

  /**
   * 获取默认分享配置
   */
  getShareInfo() {
    return {
      title: '粤东甄选 — 潮味天成，匠心甄选潮汕好物',
      path: '/pages/index/index',
      imageUrl: '/assets/images/brand/share-cover.png',
    };
  },
});
