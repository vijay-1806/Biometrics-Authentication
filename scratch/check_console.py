with open(r'behavioral-auth-ml-service\frontend\console.html', 'r', encoding='utf-8') as f:
    text = f.read()

checks = [
    ('Developer Quickstart Guide', 'Developer Quickstart Guide' in text),
    ('Single Active API Key Policy', 'Single Active API Key Policy' in text),
    ('No LMS Exam Proctoring Tab', 'LMS Exam Proctoring' not in text),
    ('Enrollment Search Box', 'enrollment-search-box' in text),
    ('Verifications Search Box', 'verifications-search-box' in text),
    ('filterEnrollmentsList', 'filterEnrollmentsList' in text),
    ('filterVerificationsBySearch', 'filterVerificationsBySearch' in text),
]

for name, passed in checks:
    print(f'{name}: {"PASS" if passed else "FAIL"}')
