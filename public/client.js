async function loadTodos() {
    try {
        // 修正: 相対パスに変更
        const res = await fetch('/get-todo');
        const todos = await res.json();

        // 修正: D1 が 0/1 を返すことを考慮
        const isValid = Array.isArray(todos) &&
            todos.every(todo =>
                typeof todo.id === 'number' &&
                typeof todo.title === 'string' &&
                (typeof todo.completed === 'boolean' || typeof todo.completed === 'number')
            );

        if (!isValid) {
            throw new Error('JSONの形式が正しくありません');
        }

        const list = document.getElementById('todo-list');
        list.innerHTML = ''; 

        todos.forEach(todo => {
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed; // 0 は false, 1 は true として扱われる

            checkbox.addEventListener('change', async () => {
                await updateTodo(todo.id, { title: todo.title, completed: checkbox.checked });
            });

            const label = document.createElement('span');
            label.textContent = ` ${todo.title}`;

            const deletebox = document.createElement('input');
            deletebox.type = 'button';
            deletebox.id = `delete-button-${todo.id}`;
            deletebox.value = '削除';

            deletebox.addEventListener('click', async () => {
                deletebox.disabled = true;
                try {
                    await deleteTodo(todo.id);
                    loadTodos(); 
                } catch (err) {
                    deletebox.disabled = false;
                    console.error('削除に失敗しました:', err);
                }
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deletebox);

            list.appendChild(li);
        });
    } catch (error) {
        console.error('Todoの読み込みに失敗しました:', error);
    }
}

async function updateTodo(id, data) {
    // 修正: 相対パスに変更
    const res = await fetch(`/put-todo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        throw new Error('completed更新失敗');
    }
}

async function addTodos() {
    const title = document.getElementById('add-input').value.trim();
    if (title === '') return;

    // 修正: 相対パスに変更
    const res = await fetch('/post-todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
    });

    if (res.ok) {
        document.getElementById('add-input').value = '';
        loadTodos();
    } else {
        alert('追加に失敗しました');
    }
}

async function deleteTodo(id) {
    // 修正: 相対パスに変更
    const res = await fetch(`/delete-todo/${id}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        throw new Error('DELETE失敗');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadTodos();

    const addButton = document.getElementById('add-todo');

    addButton.addEventListener('click', async () => {
        await addTodos();
    });
});