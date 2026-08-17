import sqlite3

DB_PATH = "database/threesixtybets.db"

conn = sqlite3.connect(DB_PATH)

conn.execute(
    """
    create table if not exists users (
        id text primary key,
        username text not null,
        email text not null unique,
        password_hash text not null,
        created_at text not null
    )
    """
)

conn.execute(
    """
    create table if not exists sessions (
        token text primary key,
        user_id text not null references users(id) on delete cascade,
        created_at text not null
    )
    """
)

conn.execute(
    """
    create table if not exists chat_messages (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        role text not null check (role in ('user', 'ai')),
        text text not null,
        created_at text not null
    )
    """
)

conn.execute(
    """
    create index if not exists chat_messages_user_created_idx
    on chat_messages (user_id, created_at)
    """
)

conn.commit()
conn.close()

print(DB_PATH)
