// Firebase統合買い物リストアプリ（簡単認証版）
class FirebaseShoppingListApp {
    constructor() {
        this.items = [];
        this.currentFilter = 'all';
        this.currentUser = null;
        this.db = null;
        this.auth = null;
        this.googleProvider = null;
        this.deleteMode = false;
        this.selectedItems = new Set();
        this.init();
    }

    async init() {
        // Firebaseが初期化されるまで待機
        await this.waitForFirebase();
        
        this.bindEvents();
        this.setupAuthStateListener();
        await this.loadItems();
        this.render();
        this.updateStats();
    }

    // Firebase初期化を待機
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseDb && window.firebaseAuth && window.googleProvider) {
                    this.db = window.firebaseDb;
                    this.auth = window.firebaseAuth;
                    this.googleProvider = window.googleProvider;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // イベントリスナーの設定
    bindEvents() {
        const addButton = document.getElementById('addButton');
        const itemInput = document.getElementById('itemInput');
        const clearCompleted = document.getElementById('clearCompleted');
        const clearAll = document.getElementById('clearAll');
        const filterButtons = document.querySelectorAll('.filter-btn');
        const googleLoginButton = document.getElementById('googleLoginButton');
        const logoutButton = document.getElementById('logoutButton');
        const confirmDelete = document.getElementById('confirmDelete');
        const cancelDelete = document.getElementById('cancelDelete');

        // モーダル関連の要素
        const addItemButton = document.getElementById('addItemButton');
        const deleteItemsButton = document.getElementById('deleteItemsButton');
        const addItemModal = document.getElementById('addItemModal');
        const closeModal = document.getElementById('closeModal');
        const cancelAdd = document.getElementById('cancelAdd');
        const confirmAdd = document.getElementById('confirmAdd');

        // モーダル機能
        addItemButton.addEventListener('click', () => this.openAddModal());
        deleteItemsButton.addEventListener('click', () => this.showDeleteList());
        closeModal.addEventListener('click', () => this.closeAddModal());
        cancelAdd.addEventListener('click', () => this.closeAddModal());
        confirmAdd.addEventListener('click', () => this.addItemFromModal());
        
        // モーダル外をクリックで閉じる
        addItemModal.addEventListener('click', (e) => {
            if (e.target === addItemModal) {
                this.closeAddModal();
            }
        });

        // Enter キーで追加
        itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addItemFromModal();
            }
        });

        // フィルターボタン
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // クリアボタン
        clearCompleted.addEventListener('click', () => this.clearCompleted());
        clearAll.addEventListener('click', () => this.clearAll());

        // 認証ボタン
        googleLoginButton.addEventListener('click', () => this.googleLogin());
        logoutButton.addEventListener('click', () => this.logout());

        // 削除リストボタン
        confirmDelete.addEventListener('click', () => this.confirmBulkDelete());
        cancelDelete.addEventListener('click', () => this.cancelBulkDelete());
    }

    // 認証状態の監視
    setupAuthStateListener() {
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
            onAuthStateChanged(this.auth, async (user) => {
                console.log('認証状態が変更されました:', user ? {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                } : 'ログアウト');
                
                this.currentUser = user;
                this.updateAuthUI();
                
                if (user) {
                    console.log('ユーザーがログインしました。アイテムを読み込みます...');
                    await this.loadItems();
                } else {
                    console.log('ユーザーがログアウトしました。アイテムをクリアします...');
                    this.items = [];
                    this.render();
                    this.updateStats();
                }
            });
        });
    }

    // 認証UIの更新
    updateAuthUI() {
        const loginForm = document.getElementById('loginForm');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const authSection = document.getElementById('authSection');

        if (this.currentUser) {
            loginForm.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = this.currentUser.email;
            authSection.classList.add('logged-in');
        } else {
            loginForm.style.display = 'block';
            userInfo.style.display = 'none';
            authSection.classList.remove('logged-in');
        }
    }

    // Googleログイン
    async googleLogin() {
        try {
            const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signInWithPopup(this.auth, this.googleProvider);
            this.showNotification('Googleでログインしました', 'success');
        } catch (error) {
            console.error('Googleログインエラー:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                this.showNotification('ログインがキャンセルされました', 'info');
            } else {
                this.showNotification('Googleログインに失敗しました', 'error');
            }
        }
    }


    // ログアウト
    async logout() {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(this.auth);
            this.showNotification('ログアウトしました', 'info');
        } catch (error) {
            this.showNotification('ログアウトに失敗しました', 'error');
        }
    }


    // 認証エラーメッセージの取得
    getAuthErrorMessage(errorCode) {
        const messages = {
            'auth/popup-closed-by-user': 'ログインがキャンセルされました',
            'auth/popup-blocked': 'ポップアップがブロックされました。ブラウザの設定を確認してください'
        };
        return messages[errorCode] || '認証エラーが発生しました';
    }

    // アイテム追加
    async addItem() {
        if (!this.currentUser) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        const input = document.getElementById('itemInput');
        const text = input.value.trim();

        if (text === '') {
            this.showNotification('アイテム名を入力してください', 'warning');
            return;
        }

        if (this.items.some(item => item.text.toLowerCase() === text.toLowerCase())) {
            this.showNotification('このアイテムは既にリストにあります', 'warning');
            return;
        }

        const newItem = {
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            userId: this.currentUser.uid
        };

        try {
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = await addDoc(collection(this.db, 'shoppingItems'), newItem);
            newItem.id = docRef.id;
            
            this.items.unshift(newItem);
            this.render();
            this.updateStats();
            
            input.value = '';
            input.focus();
            
            this.showNotification('アイテムを追加しました', 'success');
        } catch (error) {
            console.error('アイテムの追加に失敗しました:', error);
            this.showNotification('アイテムの追加に失敗しました', 'error');
        }
    }

    // Firestoreからアイテムを読み込み
    async loadItems() {
        if (!this.currentUser) {
            console.log('ユーザーがログインしていません');
            this.items = [];
            return;
        }

        console.log('Firestoreからアイテムを取得中...', {
            userId: this.currentUser.uid,
            userEmail: this.currentUser.email
        });

        try {
            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // 一時的にorderByを削除してインデックスエラーを回避
            const q = query(
                collection(this.db, 'shoppingItems'),
                where('userId', '==', this.currentUser.uid)
            );
            
            console.log('Firestoreクエリを実行中...');
            const querySnapshot = await getDocs(q);
            console.log('クエリ結果:', querySnapshot.size, '件のアイテムが見つかりました');
            
            this.items = [];
            querySnapshot.forEach((doc) => {
                const item = { id: doc.id, ...doc.data() };
                console.log('アイテムデータ:', item);
                this.items.push(item);
            });
            
            // クライアント側でソート
            this.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            console.log('全アイテム:', this.items);
            this.render();
            this.updateStats();
        } catch (error) {
            console.error('アイテムの読み込みに失敗しました:', error);
            console.error('エラーの詳細:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            this.showNotification('アイテムの読み込みに失敗しました: ' + error.message, 'error');
        }
    }

    // アイテムの完了状態を切り替え
    async toggleItem(id) {
        if (!this.currentUser) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        const item = this.items.find(item => item.id === id);
        if (!item) return;

        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await updateDoc(doc(this.db, 'shoppingItems', id), {
                completed: !item.completed
            });
            
            item.completed = !item.completed;
            this.render();
            this.updateStats();
        } catch (error) {
            console.error('アイテムの更新に失敗しました:', error);
            this.showNotification('アイテムの更新に失敗しました', 'error');
        }
    }

    // アイテム削除（リスト化）
    async deleteItem(id) {
        if (!this.currentUser) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        // 削除モードを開始
        this.deleteMode = true;
        this.selectedItems.clear();
        this.selectedItems.add(id);
        this.showDeleteList();
    }

    // 削除リストを表示
    showDeleteList() {
        const deleteListSection = document.getElementById('deleteListSection');
        const deleteList = document.getElementById('deleteList');
        
        deleteListSection.style.display = 'block';
        
        // 削除対象のアイテムを表示
        const itemsToDelete = this.items.filter(item => this.selectedItems.has(item.id));
        deleteList.innerHTML = itemsToDelete.map(item => this.getDeleteItemHTML(item)).join('');
        
        // スクロールして削除リストを表示
        deleteListSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 削除アイテムのHTMLを生成
    getDeleteItemHTML(item) {
        return `
            <div class="delete-item" data-id="${item.id}">
                <input type="checkbox" class="delete-item-checkbox" checked 
                       onchange="app.toggleDeleteSelection('${item.id}')">
                <span class="delete-item-text">${this.escapeHtml(item.text)}</span>
                <span class="delete-item-status ${item.completed ? 'completed' : 'pending'}">
                    ${item.completed ? '購入済み' : '未購入'}
                </span>
            </div>
        `;
    }

    // 削除選択を切り替え
    toggleDeleteSelection(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        
        // 選択されたアイテムがない場合は削除リストを非表示
        if (this.selectedItems.size === 0) {
            this.cancelBulkDelete();
        }
    }

    // 一括削除を確認
    async confirmBulkDelete() {
        if (this.selectedItems.size === 0) {
            this.showNotification('削除するアイテムを選択してください', 'warning');
            return;
        }

        if (confirm(`選択した${this.selectedItems.size}個のアイテムを削除しますか？`)) {
            try {
                const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                for (const id of this.selectedItems) {
                    await deleteDoc(doc(this.db, 'shoppingItems', id));
                }
                
                this.items = this.items.filter(item => !this.selectedItems.has(item.id));
                this.render();
                this.updateStats();
                this.cancelBulkDelete();
                this.showNotification(`${this.selectedItems.size}個のアイテムを削除しました`, 'success');
            } catch (error) {
                console.error('アイテムの削除に失敗しました:', error);
                this.showNotification('アイテムの削除に失敗しました', 'error');
            }
        }
    }

    // 一括削除をキャンセル
    cancelBulkDelete() {
        this.deleteMode = false;
        this.selectedItems.clear();
        document.getElementById('deleteListSection').style.display = 'none';
    }

    // フィルター設定
    setFilter(filter) {
        this.currentFilter = filter;
        
        // フィルターボタンのアクティブ状態を更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.render();
    }

    // フィルターされたアイテムを取得
    getFilteredItems() {
        switch (this.currentFilter) {
            case 'completed':
                return this.items.filter(item => item.completed);
            case 'pending':
                return this.items.filter(item => !item.completed);
            default:
                return this.items;
        }
    }

    // 購入済みアイテムをクリア（リスト化）
    clearCompleted() {
        if (!this.currentUser) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        const completedItems = this.items.filter(item => item.completed);
        if (completedItems.length === 0) {
            this.showNotification('購入済みのアイテムがありません', 'info');
            return;
        }

        // 削除モードを開始
        this.deleteMode = true;
        this.selectedItems.clear();
        completedItems.forEach(item => this.selectedItems.add(item.id));
        this.showDeleteList();
    }

    // すべてのアイテムをクリア（リスト化）
    clearAll() {
        if (!this.currentUser) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        if (this.items.length === 0) {
            this.showNotification('削除するアイテムがありません', 'info');
            return;
        }

        // 削除モードを開始
        this.deleteMode = true;
        this.selectedItems.clear();
        this.items.forEach(item => this.selectedItems.add(item.id));
        this.showDeleteList();
    }

    // レンダリング
    render() {
        const listContainer = document.getElementById('shoppingList');
        const filteredItems = this.getFilteredItems();

        if (filteredItems.length === 0) {
            listContainer.innerHTML = this.getEmptyStateHTML();
            return;
        }

        listContainer.innerHTML = filteredItems.map(item => this.getItemHTML(item)).join('');
    }

    // アイテムのHTMLを生成
    getItemHTML(item) {
        return `
            <li class="shopping-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
                <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''} 
                       onchange="app.toggleItem('${item.id}')">
                <span class="item-text">${this.escapeHtml(item.text)}</span>
                <button class="delete-btn" onclick="app.deleteItem('${item.id}')">削除</button>
            </li>
        `;
    }

    // 空の状態のHTMLを生成
    getEmptyStateHTML() {
        if (!this.currentUser) {
            return `
                <div class="empty-state">
                    <h3>🔐 スマホからもアクセス</h3>
                    <p>スマートフォンからもアクセスするには、Googleでログインしてください。</p>
                </div>
            `;
        }

        const messages = {
            all: 'まだアイテムがありません。<br>上の入力欄からアイテムを追加してください。',
            pending: '未購入のアイテムがありません。<br>すべて購入済みです！',
            completed: '購入済みのアイテムがありません。'
        };

        return `
            <div class="empty-state">
                <h3>📝 リストが空です</h3>
                <p>${messages[this.currentFilter]}</p>
            </div>
        `;
    }

    // 統計情報を更新
    updateStats() {
        const total = this.items.length;
        const completed = this.items.filter(item => item.completed).length;
        const pending = total - completed;

        document.getElementById('totalItems').textContent = `合計: ${total}`;
        document.getElementById('pendingItems').textContent = `未購入: ${pending}`;
        document.getElementById('completedItems').textContent = `購入済み: ${completed}`;
    }

    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 通知を表示
    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // スタイルを設定
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // タイプに応じて背景色を設定
        const colors = {
            success: '#48bb78',
            warning: '#ed8936',
            error: '#f56565',
            info: '#4299e1'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // アニメーション
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 3秒後に自動削除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// アプリケーションの初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FirebaseShoppingListApp();
    
    // モーダル機能を拡張
    // モーダルを開く
    app.openAddModal = function() {
        if (!this.currentUser) {
            this.showNotification('アイテムを追加するにはログインが必要です', 'warning');
            return;
        }
        
        const modal = document.getElementById('addItemModal');
        const input = document.getElementById('itemInput');
        modal.style.display = 'block';
        input.focus();
        input.value = '';
    };

    // モーダルを閉じる
    app.closeAddModal = function() {
        const modal = document.getElementById('addItemModal');
        modal.style.display = 'none';
    };

    // モーダルからアイテム追加
    app.addItemFromModal = async function() {
        const input = document.getElementById('itemInput');
        const text = input.value.trim();

        if (text === '') {
            this.showNotification('アイテム名を入力してください', 'warning');
            return;
        }

        if (!this.currentUser) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        if (this.items.some(item => item.text.toLowerCase() === text.toLowerCase())) {
            this.showNotification('このアイテムは既にリストにあります', 'warning');
            return;
        }

        const newItem = {
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            userId: this.currentUser.uid
        };

        try {
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = await addDoc(collection(this.db, 'shoppingItems'), newItem);
            newItem.id = docRef.id;
            
            this.items.unshift(newItem);
            this.render();
            this.updateStats();
            this.showNotification('アイテムが追加されました', 'success');
            this.closeAddModal();
        } catch (error) {
            console.error('アイテムの追加に失敗しました:', error);
            this.showNotification('アイテムの追加に失敗しました', 'error');
        }
    };
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter でモーダルを開く
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (app && app.openAddModal) {
            app.openAddModal();
        }
    }
    
    // Escape でモーダルを閉じる
    if (e.key === 'Escape') {
        const modal = document.getElementById('addItemModal');
        if (modal && modal.style.display === 'block' && app && app.closeAddModal) {
            app.closeAddModal();
        }
    }
});

// ページの可視性が変わった時の処理（タブ切り替え時など）
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app) {
        app.updateStats();
    }
});