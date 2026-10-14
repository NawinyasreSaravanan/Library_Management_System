"""Fill the database with dummy students, books, memberships and borrow records.

Safe to run more than once: existing rows (matched by email / ISBN) are skipped.
Run from the backend folder:   python seed.py
"""
import datetime, bcrypt
from db import query, init_db

STUDENT_PASSWORD = 'Student@123'

STUDENTS = [  # name, email, phone, membership plan (None = no card, 'pending' = awaiting approval)
    ('Arun Kumar',    'arun@student.com',    '9876500001', 'premium'),
    ('Priya Sharma',  'priya@student.com',   '9876500002', 'standard'),
    ('Karthik Raj',   'karthik@student.com', '9876500003', 'basic'),
    ('Divya Lakshmi', 'divya@student.com',   '9876500004', 'standard'),
    ('Mohammed Ali',  'ali@student.com',     '9876500005', 'basic'),
    ('Sneha Reddy',   'sneha@student.com',   '9876500006', 'pending'),
    ('Vignesh S',     'vignesh@student.com', '9876500007', None),
    ('Meena Kumari',  'meena@student.com',   '9876500008', 'premium'),
]

BOOKS = [  # title, author, isbn, category, copies, description
    ('Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 4, 'Comprehensive guide to algorithms and data structures.'),
    ('Clean Code', 'Robert C. Martin', '9780132350884', 'Computer Science', 3, 'A handbook of agile software craftsmanship.'),
    ('The Pragmatic Programmer', 'Andrew Hunt', '9780135957059', 'Computer Science', 2, 'Practical advice for modern developers.'),
    ('Python Crash Course', 'Eric Matthes', '9781718502703', 'Computer Science', 5, 'Hands-on, project-based introduction to Python.'),
    ('Database System Concepts', 'Abraham Silberschatz', '9780078022159', 'Computer Science', 3, 'Fundamentals of database systems.'),
    ('Wings of Fire', 'A. P. J. Abdul Kalam', '9788173711466', 'Biography', 4, 'Autobiography of the Missile Man of India.'),
    ('The Story of My Experiments with Truth', 'M. K. Gandhi', '9780807059098', 'Biography', 2, 'Gandhi\'s autobiography.'),
    ('Ponniyin Selvan', 'Kalki Krishnamurthy', '9788184933239', 'Fiction', 3, 'Historical novel of the Chola dynasty.'),
    ('The Alchemist', 'Paulo Coelho', '9780062315007', 'Fiction', 5, 'A shepherd\'s journey to find his treasure.'),
    ('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Fiction', 3, 'A classic of American literature.'),
    ('1984', 'George Orwell', '9780451524935', 'Fiction', 4, 'Dystopian novel of surveillance and control.'),
    ('A Brief History of Time', 'Stephen Hawking', '9780553380163', 'Science', 3, 'From the Big Bang to black holes.'),
    ('Cosmos', 'Carl Sagan', '9780345539434', 'Science', 2, 'A journey through the universe.'),
    ('Sapiens', 'Yuval Noah Harari', '9780062316097', 'History', 4, 'A brief history of humankind.'),
    ('India After Gandhi', 'Ramachandra Guha', '9780060958589', 'History', 2, 'History of the world\'s largest democracy.'),
    ('Rich Dad Poor Dad', 'Robert Kiyosaki', '9781612680194', 'Finance', 3, 'What the rich teach their kids about money.'),
    ('The Intelligent Investor', 'Benjamin Graham', '9780060555665', 'Finance', 2, 'The definitive book on value investing.'),
    ('Engineering Mathematics', 'B. S. Grewal', '9788174091956', 'Mathematics', 6, 'Standard textbook for engineering students.'),
    ('Thinking, Fast and Slow', 'Daniel Kahneman', '9780374533557', 'Psychology', 3, 'Two systems that drive the way we think.'),
    ('Atomic Habits', 'James Clear', '9780735211292', 'Self Help', 5, 'Tiny changes, remarkable results.'),
]

EVENTS = [  # title, description, days from today, time, venue
    ('Book Reading Club', 'Monthly group reading and discussion.', 5, '16:00:00', 'Reading Hall'),
    ('Author Meet: Fiction Writing', 'Talk and Q&A with a local author.', 12, '15:00:00', 'Auditorium'),
    ('Digital Library Workshop', 'Learn to use e-resources and journals.', 20, '10:30:00', 'Computer Lab'),
]

def seed():
    init_db()                                    # also creates the default admin if missing
    pw_hash = bcrypt.hashpw(STUDENT_PASSWORD.encode(), bcrypt.gensalt()).decode()
    today = datetime.date.today()

    # --- students + memberships
    for name, email, phone, plan in STUDENTS:
        if query("SELECT id FROM users WHERE email=%s", (email,), fetchone=True):
            continue
        last = query("SELECT MAX(CAST(SUBSTRING(member_id,4) AS UNSIGNED)) AS m FROM users WHERE member_id LIKE 'STU%%'",
                     fetchone=True)['m'] or 0
        uid = query("""INSERT INTO users (name,email,password,phone,role,member_id)
                       VALUES (%s,%s,%s,%s,'student',%s)""",
                    (name, email, pw_hash, phone, f"STU{last+1:04d}"), lastrowid=True)
        if plan == 'pending':
            query("""INSERT INTO membership_cards (user_id,plan,amount,txn_id,payment_date,status)
                     VALUES (%s,'standard',399,'TXN-DEMO-PENDING',NOW(),'pending')""", (uid,))
        elif plan:
            days   = {'basic': 90, 'standard': 180, 'premium': 365}[plan]
            amount = {'basic': 199, 'standard': 399, 'premium': 699}[plan]
            query("""INSERT INTO membership_cards
                     (user_id,plan,amount,txn_id,payment_date,status,approved_at,start_date,end_date)
                     VALUES (%s,%s,%s,%s,NOW(),'approved',NOW(),%s,%s)""",
                  (uid, plan, amount, f"TXN-DEMO-{uid:04d}", today, today + datetime.timedelta(days=days)))

    # --- books
    for title, author, isbn, cat, copies, desc in BOOKS:
        if query("SELECT id FROM books WHERE isbn=%s", (isbn,), fetchone=True):
            continue
        query("""INSERT INTO books (title,author,isbn,category,total_copies,available,description)
                 VALUES (%s,%s,%s,%s,%s,%s,%s)""", (title, author, isbn, cat, copies, copies, desc))

    # --- events
    if not query("SELECT COUNT(*) AS c FROM events", fetchone=True)['c']:
        for title, desc, offset, tm, venue in EVENTS:
            query("""INSERT INTO events (title,description,event_date,event_time,venue)
                     VALUES (%s,%s,%s,%s,%s)""",
                  (title, desc, today + datetime.timedelta(days=offset), tm, venue))

    # --- sample borrow records (only on a fresh database)
    if not query("SELECT COUNT(*) AS c FROM issued_books", fetchone=True)['c']:
        uid  = lambda e: query("SELECT id FROM users WHERE email=%s", (e,), fetchone=True)['id']
        bid  = lambda i: query("SELECT id FROM books WHERE isbn=%s", (i,), fetchone=True)['id']
        d    = lambda n: today + datetime.timedelta(days=n)
        rows = [  # student, isbn, issued, due, returned, fine, status
            ('arun@student.com',   '9780132350884', d(-5),  d(9),   None,  0,  'issued'),
            ('arun@student.com',   '9781718502703', d(-20), d(-6),  None,  0,  'issued'),   # overdue
            ('priya@student.com',  '9780062315007', d(-3),  d(11),  None,  0,  'issued'),
            ('karthik@student.com','9788173711466', d(-30), d(-16), d(-10), 60, 'returned'),
            ('divya@student.com',  '9780735211292', d(-10), d(4),   None,  0,  'issued'),
            ('meena@student.com',  '9780451524935', d(-25), d(-11), None,  0,  'issued'),   # overdue
        ]
        for email, isbn, iss, due, ret, fine, st in rows:
            query("""INSERT INTO issued_books (book_id,user_id,issued_date,due_date,return_date,fine,status)
                     VALUES (%s,%s,%s,%s,%s,%s,%s)""", (bid(isbn), uid(email), iss, due, ret, fine, st))

    # --- keep stock in sync with who currently holds what
    query("""UPDATE books b SET available = b.total_copies -
             (SELECT COUNT(*) FROM issued_books i WHERE i.book_id=b.id AND i.status='issued')""")

    print("\nSeed complete.")
    print("  Admin   : admin@library.com / Library@2024   -> /admin/login.html")
    print(f"  Students: arun@student.com (and others) / {STUDENT_PASSWORD}   -> /login.html")

if __name__ == '__main__':
    seed()
