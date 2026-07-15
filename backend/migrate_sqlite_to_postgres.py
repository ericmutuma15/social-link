import os
import sqlite3
import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from dotenv import load_dotenv


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

logging.basicConfig(level=logging.INFO)

# Old SQLite database
SQLITE_DB = "instance/users.db"

# New Supabase PostgreSQL database
POSTGRES_URL = os.getenv("DATABASE_URL")


if not POSTGRES_URL:
    raise Exception(
        "DATABASE_URL is missing.\n"
        "Export it first:\n"
        "export DATABASE_URL='postgresql://user:password@host:port/database'"
    )


print("=" * 60)
print("SQLite  -> PostgreSQL Migration")
print("=" * 60)


# ============================================================
# DATABASE CONNECTIONS
# ============================================================

sqlite_conn = sqlite3.connect(SQLITE_DB)
sqlite_conn.row_factory = sqlite3.Row


postgres_engine = create_engine(
    POSTGRES_URL,
    pool_pre_ping=True
)

PostgresSession = sessionmaker(bind=postgres_engine)

postgres = PostgresSession()


# ============================================================
# TABLE MIGRATION ORDER
# ============================================================

TABLE_ORDER = [

    # Base table
    "users",

    # Depends on users
    "posts",
    "comments",
    "likes",
    "bookmarks",

    # Social relationships
    "friend_requests",
    "friendship",
    "notification",

    # Messaging
    "messages",

    # Community system
    "communities",
    "community_members",

    # Stories
    "stories",
]


# ============================================================
# BOOLEAN COLUMNS
# ============================================================

BOOLEAN_COLUMNS = {
    "is_super_user",
    "read",
    "is_read",
}


# ============================================================
# SQLITE HELPERS
# ============================================================

def get_sqlite_columns(table):

    cursor = sqlite_conn.execute(
        f"PRAGMA table_info({table})"
    )

    columns = []

    for row in cursor.fetchall():
        columns.append(row["name"])

    return columns



def get_sqlite_rows(table):

    cursor = sqlite_conn.execute(
        f"SELECT * FROM {table}"
    )

    return cursor.fetchall()



# ============================================================
# DATA CLEANING
# ============================================================

def convert_value(column, value):

    """
    Convert SQLite values into PostgreSQL compatible values
    """

    # Convert SQLite booleans
    if column in BOOLEAN_COLUMNS:

        if value in (0, "0", False, None):
            return False

        if value in (1, "1", True):
            return True


    # Fix corrupted foreign keys
    if column in [
        "sender_id",
        "receiver_id",
        "user_id",
        "friend_id",
        "requester_id",
        "recipient_id",
        "post_id",
        "community_id"
    ]:

        if value in [
            "undefined",
            "null",
            "",
            None
        ]:
            return None


        try:
            return int(value)

        except ValueError:
            return None


    return value



# ============================================================
# INSERT BUILDER
# ============================================================

def build_insert_query(table, columns):

    column_string = ", ".join(columns)

    values_string = ", ".join(
        [
            f":{column}"
            for column in columns
        ]
    )


    query = f"""
        INSERT INTO {table}
        ({column_string})
        VALUES ({values_string})
        ON CONFLICT DO NOTHING
    """


    return text(query)



# ============================================================
# MIGRATION FUNCTION
# ============================================================

def migrate_table(table):

    print()
    print(f"Migrating {table}...")


    rows = get_sqlite_rows(table)


    if not rows:
        print(f"Skipping {table} (empty)")
        return


    columns = get_sqlite_columns(table)


    insert_query = build_insert_query(
        table,
        columns
    )


    count = 0


    for row in rows:

        data = {}
                # Skip corrupted message rows
        if table == "messages":

            if row["sender_id"] in ("undefined", None):
                print(
                    f"Skipping message {row['id']} - invalid sender"
                )
                continue


            if row["receiver_id"] in ("undefined", None):
                print(
                    f"Skipping message {row['id']} - invalid receiver"
                )
                continue


        for column in columns:

            value = row[column]

            value = convert_value(
                column,
                value
            )

            data[column] = value


        postgres.execute(
            insert_query,
            data
        )


        count += 1


    postgres.commit()


    print(
        f"✓ {table}: {count} rows migrated"
    )
    # ============================================================
# VERIFY TABLE EXISTS IN POSTGRES
# ============================================================

def postgres_table_exists(table):

    query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = :table
        )
    """)

    result = postgres.execute(
        query,
        {
            "table": table
        }
    )

    return result.scalar()



# ============================================================
# RESET FAILED TRANSACTIONS
# ============================================================

def rollback_transaction():

    try:
        postgres.rollback()

    except Exception:
        pass



# ============================================================
# RUN MIGRATION
# ============================================================

if __name__ == "__main__":

    try:

        print()
        print("Checking PostgreSQL tables...")
        print()


        missing_tables = []


        for table in TABLE_ORDER:

            if not postgres_table_exists(table):

                missing_tables.append(table)



        if missing_tables:

            print(
                "WARNING: These tables do not exist in PostgreSQL:"
            )

            for table in missing_tables:
                print(
                    f" - {table}"
                )


            print()
            print(
                "Run Flask migrations first:"
            )

            print(
                "flask db upgrade"
            )

            exit(1)



        print(
            "All PostgreSQL tables detected."
        )

        print()


        # ----------------------------------------
        # START MIGRATION
        # ----------------------------------------

        for table in TABLE_ORDER:

            try:

                migrate_table(table)


            except Exception as error:

                rollback_transaction()

                print()
                print(
                    f"FAILED migrating {table}"
                )

                print(error)

                print()

                raise



        print()
        print("=" * 60)
        print("Migration completed successfully")
        print("=" * 60)


        # ----------------------------------------
        # FINAL COUNTS
        # ----------------------------------------

        print()
        print("PostgreSQL row counts:")
        print()


        for table in TABLE_ORDER:

            result = postgres.execute(
                text(
                    f"SELECT COUNT(*) FROM {table}"
                )
            )

            count = result.scalar()

            print(
                f"{table}: {count}"
            )


    finally:

        sqlite_conn.close()

        postgres.close()