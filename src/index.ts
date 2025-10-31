import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Cloudflare Workers の型定義
// D1Database は D1 の型
type Bindings = {
  todo_DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// すべてのルートでCORSを許可
app.use('*', cors())

// 全件取得
app.get('/get-todo', async (c) => {
  const db = c.env.todo_DB
  try {
    const { results } = await db.prepare('SELECT * FROM todos').all()
    // D1 は completed を 1 (true) / 0 (false) の数値で返すため、boolean に変換
    const todos = results.map(todo => ({
      ...todo,
      completed: !!todo.completed
    }));
    return c.json(todos)
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// 型定義 (リクエストボディ用)
type Todo = {
  title?: string
  completed?: boolean
}

// 追加
app.post('/post-todo', async (c) => {
  let data: Todo
  try {
    data = await c.req.json()
  } catch {
    return c.json({ success: false, error: '不正なJSONです' }, 400)
  }

  if (!data.title) {
    return c.json({ success: false, error: 'titleは必須です' }, 400)
  }

  const db = c.env.todo_DB
  try {
    // D1 では ? を使って bind する
    const { meta } = await db.prepare('INSERT INTO todos (title, completed) VALUES (?, ?)')
      .bind(data.title, false) // D1 は boolean を 0/1 に自動変換
      .run()
    
    return c.json({ success: true, id: meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// 更新
app.put('/put-todo/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ success: false, error: 'IDは数字で指定してください' }, 400)
  }

  let data: Todo
  try {
    data = await c.req.json()
  } catch {
    return c.json({ success: false, error: '不正なJSONです' }, 400)
  }

  if (typeof data.title !== 'string' || typeof data.completed !== 'boolean') {
    return c.json({ success: false, error: 'titleとcompletedが正しい形式ではありません' }, 400)
  }

  const db = c.env.todo_DB
  try {
    const { meta } = await db.prepare('UPDATE todos SET title = ?, completed = ? WHERE id = ?')
      .bind(data.title, data.completed, id)
      .run()

    // meta.changes で変更された行数がわかる
    if (meta.changes === 0) {
      return c.json({ success: false, error: '該当IDのTODOが見つかりません' }, 404)
    }

    return c.json({ success: true, id })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// 削除
app.delete('/delete-todo/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ success: false, error: 'IDは数字で指定してください' }, 400)
  }

  const db = c.env.todo_DB
  try {
    const { meta } = await db.prepare('DELETE FROM todos WHERE id = ?')
      .bind(id)
      .run()

    if (meta.changes === 0) {
      return c.json({ success: false, error: 'Todoが見つからないか、すでに削除済みです' }, 410)
    }

    return c.json({ success: true, id })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Cloudflare Workers では `serve` の代わりに app を default export する
export default app