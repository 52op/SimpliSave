import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // App
      "app.title": "SimpliSave",
      "app.description": "Modern bookmark and memo app",
      
      // Navigation
      "nav.home": "Home",
      "nav.bookmarks": "Bookmarks",
      "nav.memos": "Memos",
      "nav.settings": "Settings",
      
      // Auth
      "auth.login": "Login",
      "auth.register": "Register",
      "auth.logout": "Logout",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.name": "Name",
      "auth.confirmPassword": "Confirm Password",
      "auth.noAccount": "Don't have an account?",
      "auth.haveAccount": "Already have an account?",
      
      // Bookmarks
      "bookmarks.title": "Bookmarks",
      "bookmarks.add": "Add Bookmark",
      "bookmarks.edit": "Edit Bookmark",
      "bookmarks.delete": "Delete Bookmark",
      "bookmarks.deleteConfirm": "Are you sure you want to delete this bookmark?",
      "bookmarks.url": "URL",
      "bookmarks.urlPlaceholder": "https://example.com",
      "bookmarks.titlePlaceholder": "Bookmark title",
      "bookmarks.description": "Description",
      "bookmarks.descriptionPlaceholder": "Optional description",
      "bookmarks.category": "Category",
      "bookmarks.tags": "Tags",
      "bookmarks.tagsPlaceholder": "Add tags...",
      "bookmarks.favorite": "Favorite",
      "bookmarks.archived": "Archived",
      "bookmarks.visitCount": "Visits",
      "bookmarks.noBookmarks": "No bookmarks yet",
      "bookmarks.addFirst": "Add your first bookmark",
      "bookmarks.search": "Search bookmarks...",
      "bookmarks.filterByCategory": "Filter by category",
      "bookmarks.allCategories": "All categories",
      
      // Memos
      "memos.title": "Memos",
      "memos.add": "Add Memo",
      "memos.edit": "Edit Memo",
      "memos.delete": "Delete Memo",
      "memos.deleteConfirm": "Are you sure you want to delete this memo?",
      "memos.titlePlaceholder": "Memo title",
      "memos.contentPlaceholder": "Write your memo...",
      "memos.color": "Color",
      "memos.pin": "Pin",
      "memos.unpin": "Unpin",
      "memos.pinned": "Pinned",
      "memos.noMemos": "No memos yet",
      "memos.addFirst": "Create your first memo",
      "memos.search": "Search memos...",
      
      // Categories
      "categories.title": "Categories",
      "categories.add": "Add Category",
      "categories.edit": "Edit Category",
      "categories.delete": "Delete Category",
      "categories.name": "Category name",
      "categories.namePlaceholder": "Category name",
      "categories.color": "Color",
      "categories.icon": "Icon",
      "categories.type": "Type",
      "categories.typeBookmark": "Bookmark",
      "categories.typeMemo": "Memo",
      
      // Tags
      "tags.title": "Tags",
      "tags.add": "Add Tag",
      "tags.delete": "Delete Tag",
      "tags.name": "Tag name",
      "tags.namePlaceholder": "Tag name",
      "tags.color": "Color",
      
      // Common
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.delete": "Delete",
      "common.edit": "Edit",
      "common.close": "Close",
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
      "common.actions": "Actions",
      "common.createdAt": "Created at",
      "common.updatedAt": "Updated at",
      "common.confirm": "Confirm",
      "common.selectCategory": "Select category",
      "common.noCategory": "No category",
      "common.createCategory": "Create category",
    }
  },
  zh: {
    translation: {
      // App
      "app.title": "SimpliSave",
      "app.description": "现代化网址收藏与备忘录应用",
      
      // Navigation
      "nav.home": "首页",
      "nav.bookmarks": "收藏",
      "nav.memos": "备忘录",
      "nav.settings": "设置",
      
      // Auth
      "auth.login": "登录",
      "auth.register": "注册",
      "auth.logout": "退出",
      "auth.email": "邮箱",
      "auth.password": "密码",
      "auth.name": "昵称",
      "auth.confirmPassword": "确认密码",
      "auth.noAccount": "还没有账号？",
      "auth.haveAccount": "已有账号？",
      
      // Bookmarks
      "bookmarks.title": "网址收藏",
      "bookmarks.add": "添加收藏",
      "bookmarks.edit": "编辑收藏",
      "bookmarks.delete": "删除收藏",
      "bookmarks.deleteConfirm": "确定要删除这个收藏吗？",
      "bookmarks.url": "网址",
      "bookmarks.urlPlaceholder": "https://example.com",
      "bookmarks.titlePlaceholder": "收藏标题",
      "bookmarks.description": "描述",
      "bookmarks.descriptionPlaceholder": "可选描述",
      "bookmarks.category": "分类",
      "bookmarks.tags": "标签",
      "bookmarks.tagsPlaceholder": "添加标签...",
      "bookmarks.favorite": "收藏",
      "bookmarks.archived": "已归档",
      "bookmarks.visitCount": "访问次数",
      "bookmarks.noBookmarks": "暂无收藏",
      "bookmarks.addFirst": "添加第一个收藏",
      "bookmarks.search": "搜索收藏...",
      "bookmarks.filterByCategory": "按分类筛选",
      "bookmarks.allCategories": "全部分类",
      
      // Memos
      "memos.title": "备忘录",
      "memos.add": "添加备忘录",
      "memos.edit": "编辑备忘录",
      "memos.delete": "删除备忘录",
      "memos.deleteConfirm": "确定要删除这个备忘录吗？",
      "memos.titlePlaceholder": "备忘录标题",
      "memos.contentPlaceholder": "写下你的想法...",
      "memos.color": "颜色",
      "memos.pin": "置顶",
      "memos.unpin": "取消置顶",
      "memos.pinned": "已置顶",
      "memos.noMemos": "暂无备忘录",
      "memos.addFirst": "创建第一个备忘录",
      "memos.search": "搜索备忘录...",
      
      // Categories
      "categories.title": "分类管理",
      "categories.add": "添加分类",
      "categories.edit": "编辑分类",
      "categories.delete": "删除分类",
      "categories.name": "分类名称",
      "categories.namePlaceholder": "分类名称",
      "categories.color": "颜色",
      "categories.icon": "图标",
      "categories.type": "类型",
      "categories.typeBookmark": "收藏",
      "categories.typeMemo": "备忘录",
      
      // Tags
      "tags.title": "标签管理",
      "tags.add": "添加标签",
      "tags.delete": "删除标签",
      "tags.name": "标签名称",
      "tags.namePlaceholder": "标签名称",
      "tags.color": "颜色",
      
      // Common
      "common.save": "保存",
      "common.cancel": "取消",
      "common.delete": "删除",
      "common.edit": "编辑",
      "common.close": "关闭",
      "common.loading": "加载中...",
      "common.error": "错误",
      "common.success": "成功",
      "common.actions": "操作",
      "common.createdAt": "创建时间",
      "common.updatedAt": "更新时间",
      "common.confirm": "确认",
      "common.selectCategory": "选择分类",
      "common.noCategory": "无分类",
      "common.createCategory": "创建分类",
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "zh",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
