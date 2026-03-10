import re
print("Match 'notifications' -> '^notifications/?$':", bool(re.match(r"^notifications/?$", "notifications")))
print("Match 'notifications' -> '^notifications\/?$':", bool(re.match(r"^notifications\/?$", "notifications")))
