# AthleteAI Process Flow

## 1. User Journey Flow

### Tools Used:
<table>
  <tr>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/firebase.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/google_authenticator.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/gemini.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/database.png" width="100"/></td>
  </tr>
</table>

```mermaid
graph TD
    A[User Lands on Landing Page] --> B{Has Account?}
    B -->|No| C[Google Sign Up]
    B -->|Yes| D[Google Sign In]
    C --> E[Initial Assessment]
    D --> F{Has Assessment?}
    F -->|No| E
    F -->|Yes| G{Has Yo-Yo Test?}
    E --> G
    G -->|No| H[Take Yo-Yo Test]
    G -->|Yes| I[Dashboard]
    H --> I

    I --> J[Access Features]
    J --> K[Diet Plan]
    J --> L[Injury Prevention]
    J --> M[Mental Health Chat]
    J --> N[Performance Tracking]
```

## 2. Data Flow

### Tools Used:
<table>
  <tr>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/google_authenticator.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/firestore.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/gemini.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/0ff94fad209eaeea2a3475022e0c2610d20c2ebb/docs/icons/ai_process.png" width="100"/></td>
  </tr>
</table>

```mermaid
graph LR
    A[User Input] --> B[Firebase Auth]
    B --> C[Firestore Database]
    C --> D[AI Processing]
    D --> E[Gemini API]
    E --> F[Response Processing]
    F --> G[UI Update]
    G --> H[User Feedback]
```

# AthleteAI System Architecture

## 1. High-Level Architecture

### Tools Used:
<table>
  <tr>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/0ff94fad209eaeea2a3475022e0c2610d20c2ebb/docs/icons/frontend.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/backend.jpg" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/authentication.jpg" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/database.png" width="100"/></td>
  </tr>
</table>

```mermaid
graph TD
    subgraph "Frontend Layer"
        A[Landing Page]
        B[Dashboard]
        C[Assessment Module]
        D[Feature Modules]
    end

    subgraph "Authentication Layer"
        E[Firebase Auth]
        F[Google OAuth]
    end

    subgraph "Data Layer"
        G[Firestore]
        H[Local Storage]
    end

    subgraph "AI Layer"
        I[Gemini API]
        J[Response Processing]
    end

    A --> E
    B --> G
    C --> G
    D --> G
    E --> F
    G --> I
    I --> J
    J --> D
```

## 2. Security Architecture

### Security Tools Used:
<table>
  <tr>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/oauth.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/firebase_rules.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/encryption.png" width="100"/></td>
    <td><img src="https://github.com/CoderYUI/athelete-managment/blob/b548ff1f262ea2b907f112e22a86c82d6a4c6084/docs/icons/access_control.jpg" width="100"/></td>
  </tr>
</table>

```mermaid
graph TD
    subgraph "Security Layers"
        A[OAuth 2.0]
        B[Firebase Rules]
        C[API Keys]
    end

    subgraph "Data Protection"
        D[Encryption]
        E[Access Control]
        F[Rate Limiting]
    end

    subgraph "Validation"
        G[Input Sanitization]
        H[Request Validation]
        I[Response Validation]
    end

    A --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
```

---
