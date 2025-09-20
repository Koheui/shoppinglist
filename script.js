// Firebase統合買い物リストアプリ（簡単認証版）
class FirebaseShoppingListApp {
    constructor() {
        this.items = [];
        this.currentFilter = 'all';
        this.currentUser = null;
        this.db = null;
        this.auth = null;
        this.googleProvider = null;
        this.isAuthenticated = false;
        // 家族共有パスワード（family-config.jsから読み込み）
        this.familyPassword = window.FAMILY_CONFIG ? window.FAMILY_CONFIG.password : 'family2024';
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
        console.log('bindEvents開始');
        
        // ログイン機能のみに絞ってテスト
        const passwordInput = document.getElementById('passwordInput');
        const loginButton = document.getElementById('loginButton');
        const logoutButton = document.getElementById('logoutButton');
        
        console.log('要素の確認:', {
            passwordInput: passwordInput,
            loginButton: loginButton,
            logoutButton: logoutButton
        });

        // ログイン機能のイベントリスナー設定
        if (loginButton) {
            console.log('ログインボタンにイベントリスナーを設定');
            loginButton.addEventListener('click', () => {
                console.log('ログインボタンがクリックされました');
                this.familyLogin();
            });
        } else {
            console.error('ログインボタンが見つかりません');
        }
        
        if (logoutButton) {
            console.log('ログアウトボタンにイベントリスナーを設定');
            logoutButton.addEventListener('click', () => {
                console.log('ログアウトボタンがクリックされました');
                this.familyLogout();
            });
        } else {
            console.error('ログアウトボタンが見つかりません');
        }
        
        if (passwordInput) {
            console.log('パスワード入力欄にイベントリスナーを設定');
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enterキーが押されました');
                    this.familyLogin();
                }
            });
        } else {
            console.error('パスワード入力欄が見つかりません');
        }

        // モーダル関連の要素
        const addItemButton = document.getElementById('addItemButton');
        const addItemModal = document.getElementById('addItemModal');
        const closeModal = document.getElementById('closeModal');
        const cancelAdd = document.getElementById('cancelAdd');
        const confirmAdd = document.getElementById('confirmAdd');
        const itemInput = document.getElementById('itemInput');

        console.log('モーダル要素の確認:', {
            addItemButton: addItemButton,
            addItemModal: addItemModal,
            closeModal: closeModal,
            cancelAdd: cancelAdd,
            confirmAdd: confirmAdd,
            itemInput: itemInput
        });

        // モーダル機能のイベントリスナー設定
        if (addItemButton) {
            console.log('追加ボタンにイベントリスナーを設定');
            addItemButton.addEventListener('click', () => {
                console.log('追加ボタンがクリックされました');
                this.openAddModal();
            });
        } else {
            console.error('追加ボタンが見つかりません');
        }
        
        if (closeModal) {
            console.log('閉じるボタンにイベントリスナーを設定');
            closeModal.addEventListener('click', () => {
                console.log('閉じるボタンがクリックされました');
                this.closeAddModal();
            });
        } else {
            console.error('閉じるボタンが見つかりません');
        }
        
        if (cancelAdd) {
            console.log('キャンセルボタンにイベントリスナーを設定');
            cancelAdd.addEventListener('click', () => {
                console.log('キャンセルボタンがクリックされました');
                this.closeAddModal();
            });
        } else {
            console.error('キャンセルボタンが見つかりません');
        }
        
        if (confirmAdd) {
            console.log('確認ボタンにイベントリスナーを設定');
            confirmAdd.addEventListener('click', () => {
                console.log('確認ボタンがクリックされました');
                this.addItemFromModal();
            });
        } else {
            console.error('確認ボタンが見つかりません');
        }
        
        if (itemInput) {
            console.log('アイテム入力欄にイベントリスナーを設定');
            itemInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('アイテム入力欄でEnterキーが押されました');
                    this.addItemFromModal();
                }
            });
        } else {
            console.error('アイテム入力欄が見つかりません');
        }
        
        // モーダル外をクリックで閉じる
        if (addItemModal) {
            console.log('モーダルにクリックイベントを設定');
            addItemModal.addEventListener('click', (e) => {
                if (e.target === addItemModal) {
                    console.log('モーダル外がクリックされました');
                    this.closeAddModal();
                }
            });
        } else {
            console.error('モーダルが見つかりません');
        }

        console.log('bindEvents完了');
    }

    // 家族パスワードでログイン
    familyLogin() {
        console.log('familyLoginが呼び出されました');
        
        const passwordInput = document.getElementById('passwordInput');
        console.log('passwordInput:', passwordInput);
        
        if (!passwordInput) {
            console.error('passwordInputが見つかりません');
            this.showNotification('パスワード入力欄が見つかりません', 'error');
            return;
        }
        
        const password = passwordInput.value.trim();
        console.log('入力されたパスワード:', password);
        console.log('正しいパスワード:', this.familyPassword);
        
        if (password === this.familyPassword) {
            console.log('パスワードが正しいです。ログインします。');
            this.isAuthenticated = true;
            this.updateAuthUI();
            this.loadItems();
            passwordInput.value = '';
            this.showNotification('ログインしました', 'success');
        } else {
            console.log('パスワードが間違っています。');
            this.showNotification('パスワードが正しくありません', 'error');
            passwordInput.value = '';
        }
    }

    // 家族認証からログアウト
    familyLogout() {
        this.isAuthenticated = false;
        this.items = [];
        this.updateAuthUI();
        this.render();
        this.showNotification('ログアウトしました', 'success');
    }

    // モーダルを開く
    openAddModal() {
        console.log('openAddModalが呼び出されました');
        
        if (!this.isAuthenticated) {
            this.showNotification('アイテムを追加するにはログインが必要です', 'warning');
            return;
        }
        
        const modal = document.getElementById('addItemModal');
        const itemInput = document.getElementById('itemInput');
        
        if (modal) {
            modal.style.display = 'block';
            if (itemInput) {
                itemInput.value = '';
                itemInput.focus();
            }
            console.log('モーダルを開きました');
        } else {
            console.error('addItemModalが見つかりません');
        }
    }

    // モーダルを閉じる
    closeAddModal() {
        console.log('closeAddModalが呼び出されました');
        
        const modal = document.getElementById('addItemModal');
        const itemInput = document.getElementById('itemInput');
        
        if (modal) {
            modal.style.display = 'none';
            if (itemInput) {
                itemInput.value = '';
            }
            console.log('モーダルを閉じました');
        } else {
            console.error('addItemModalが見つかりません');
        }
    }

    // モーダルからアイテム追加
    async addItemFromModal() {
        console.log('addItemFromModalが呼び出されました');
        
        const input = document.getElementById('itemInput');
        if (!input) {
            console.error('itemInputが見つかりません');
            this.showNotification('入力欄が見つかりません', 'error');
            return;
        }
        
        const text = input.value.trim();

        if (text === '') {
            this.showNotification('アイテム名を入力してください', 'warning');
            return;
        }

        if (!this.isAuthenticated) {
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
            familyId: 'family' // 家族共有用の固定ID
        };

        try {
            console.log('Firestoreにアイテムを追加中...');
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const docRef = await addDoc(collection(this.db, 'shoppingItems'), newItem);
            newItem.id = docRef.id;
            
            this.items.unshift(newItem);
            this.render();
            this.updateStats();
            this.showNotification('アイテムが追加されました', 'success');
            this.closeAddModal();
            console.log('アイテムの追加が完了しました');
        } catch (error) {
            console.error('アイテムの追加に失敗しました:', error);
            this.showNotification('アイテムの追加に失敗しました', 'error');
        }
    }

    // 認証状態の監視（家族共有版）
    setupAuthStateListener() {
        // ローカルストレージから認証状態を復元
        const savedAuth = localStorage.getItem('familyAuth');
        if (savedAuth === 'true') {
            this.isAuthenticated = true;
            this.updateAuthUI();
            this.loadItems();
        }
    }

    // 認証UIの更新（家族共有版）
    updateAuthUI() {
        const passwordForm = document.getElementById('passwordForm');
        const userInfo = document.getElementById('userInfo');
        const authSection = document.getElementById('authSection');

        if (this.isAuthenticated) {
            passwordForm.style.display = 'none';
            userInfo.style.display = 'flex';
            authSection.classList.add('logged-in');
            localStorage.setItem('familyAuth', 'true');
        } else {
            passwordForm.style.display = 'block';
            userInfo.style.display = 'none';
            authSection.classList.remove('logged-in');
            localStorage.removeItem('familyAuth');
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
        if (!this.isAuthenticated) {
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
            familyId: 'family' // 家族共有用の固定ID
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

    // Firestoreからアイテムを読み込み（家族共有版）
    async loadItems() {
        if (!this.isAuthenticated) {
            console.log('認証されていません');
            this.items = [];
            return;
        }

        console.log('Firestoreからアイテムを取得中...');

        try {
            const { collection, query, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // 家族共有のため、すべてのアイテムを取得
            const q = query(
                collection(this.db, 'shoppingItems'),
                orderBy('createdAt', 'desc')
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

    // toggleItemメソッドは削除済み（完全削除に変更）

    // アイテム削除（即座に削除）
    async deleteItem(id) {
        console.log('deleteItemが呼び出されました:', id);
        
        if (!this.isAuthenticated) {
            this.showNotification('ログインが必要です', 'warning');
            return;
        }

        const item = this.items.find(item => item.id === id);
        if (!item) {
            console.error('削除するアイテムが見つかりません:', id);
            return;
        }

        try {
            console.log('Firestoreからアイテムを削除中...');
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            await deleteDoc(doc(this.db, 'shoppingItems', id));
            
            // ローカルの配列から削除
            this.items = this.items.filter(item => item.id !== id);
            this.render();
            this.showNotification('アイテムを削除しました', 'success');
            console.log('アイテムの削除が完了しました');
        } catch (error) {
            console.error('アイテムの削除に失敗しました:', error);
            this.showNotification('アイテムの削除に失敗しました', 'error');
        }
    }

    // 不要な削除関連メソッドは削除済み（即座削除に変更）

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
        if (!this.isAuthenticated) {
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
        if (!this.isAuthenticated) {
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

    // アイテムのHTMLを生成（単一チェックボックスで完全削除）
    getItemHTML(item) {
        return `
            <li class="shopping-item" data-id="${item.id}">
                <input type="checkbox" class="item-checkbox" 
                       onchange="app.deleteItem('${item.id}')">
                <span class="item-text">${this.escapeHtml(item.text)}</span>
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

    // 不要な削除関連メソッドは削除済み（単一チェックボックスに統一）

    // 統計情報を更新（削除）
    updateStats() {
        // 統計情報は不要なので空の実装
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
let isInitialized = false;

function initializeApp() {
    if (isInitialized) {
        console.log('アプリは既に初期化されています');
        return;
    }
    
    console.log('アプリケーションを初期化します');
    console.log('現在のDOM状態:', document.readyState);
    
    // 要素の存在を確認
    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.getElementById('loginButton');
    console.log('初期化時の要素確認:', {
        passwordInput: passwordInput,
        loginButton: loginButton
    });
    
    isInitialized = true;
    app = new FirebaseShoppingListApp();
}

// window.onloadイベントで確実に初期化
window.addEventListener('load', () => {
    console.log('window.loadイベントが発生しました');
    console.log('DOM状態:', document.readyState);
    initializeApp();
});

// フォールバック: DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoadedイベントが発生しました');
    if (!isInitialized) {
        setTimeout(initializeApp, 1000);
    }
});
    
    // モーダル機能はクラス内で実装済み

    // モーダルからアイテム追加（クラス内に移動済み）

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter でモーダルを開く
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (app && typeof app.openAddModal === 'function') {
            app.openAddModal();
        }
    }
    
    // Escape でモーダルを閉じる
    if (e.key === 'Escape') {
        const modal = document.getElementById('addItemModal');
        if (modal && modal.style.display === 'block' && app && typeof app.closeAddModal === 'function') {
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