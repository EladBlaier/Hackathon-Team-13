# Only these extensions may be written into S3 keys. The raw filename is
# attacker-controlled, so anything else collapses to the safe default.
ALLOWED_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "webp", "gif"})


def get_file_extension(filename: str | None, default: str = "jpg") -> str:
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            return ext
    return default
