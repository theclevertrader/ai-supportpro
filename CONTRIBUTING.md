# Contributing to AI SupportPro

First off, thank you for considering contributing to **AI SupportPro**! It's people like you that make the open-source AI community amazing.

---

## Code of Conduct

We expect all contributors to adhere to a respectful, harassment-free environment for everyone regardless of level of experience, gender, identity, or background.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Check the [Issues tab](https://github.com/theclevertrader/ai-supportpro/issues) to ensure the bug hasn't already been reported.
- Open a new Issue using the **Bug Report** template.
- Provide detailed reproduction steps, expected vs. actual behavior, and environment details (Python version, OS, browser).

### 2. Suggesting Enhancements
- Open a feature request under [Issues](https://github.com/theclevertrader/ai-supportpro/issues).
- Describe the motivation, use case, and proposed implementation details.

### 3. Submitting Pull Requests (PRs)
1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Set up your local environment:
   ```bash
   # Backend
   cd backend
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```
3. Run tests to ensure all tests pass:
   ```bash
   cd ../backend
   pytest tests/ -v
   ```
4. Commit your changes with a clear commit message:
   ```bash
   git commit -m "feat(rag): add support for hybrid bm25 + vector search"
   ```
5. Push to your fork and submit a Pull Request to `main`.

---

## Development Guidelines

- **Clean Architecture:** Keep business logic separated from API route handlers.
- **Security First:** Never hardcode API keys or secrets. Always use environment variables.
- **Test Coverage:** Any new core backend feature should include unit/integration tests in `backend/tests/`.

---

Thank you for helping make AI SupportPro better! ⭐
