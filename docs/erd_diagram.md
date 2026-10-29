erDiagram
    %% Entities and Attributes

    USER {
        ObjectId _id PK
        String name
        String email UK
        String password
        String phone
        String avatar
        Number walletBalance
        Boolean isVerified
        String username UK
        String expoPushToken
        String upiId
        Boolean isVirtual
        ObjectId createdBy FK
    }

    GROUP {
        ObjectId _id PK
        String name
        String type
        ObjectId adminId FK
    }

    EXPENSE {
        ObjectId _id PK
        ObjectId groupId FK
        Number amount
        ObjectId payerId FK
        Date date
        String category
        String notes
        String splitType
    }

    FRIENDSHIP {
        ObjectId _id PK
        ObjectId requester FK
        ObjectId recipient FK
        String status
    }

    DIRECT_SPLIT {
        ObjectId _id PK
        ObjectId payerId FK
        ObjectId otherUserId FK
        Number amount
        String description
        Number payerShare
        Date date
    }

    DIRECT_SETTLE {
        ObjectId _id PK
        ObjectId fromUserId FK
        ObjectId toUserId FK
        Number amount
        String status
        Date confirmedAt
    }

    SETTLEMENT {
        ObjectId _id PK
        ObjectId groupId FK
        ObjectId fromUserId FK
        ObjectId toUserId FK
        Number amount
        Date date
        String notes
    }

    PERSONAL_TRANSACTION {
        ObjectId _id PK
        ObjectId userId FK
        String type
        Number amount
        String category
        Date date
        String notes
    }

    BUDGET {
        ObjectId _id PK
        ObjectId userId FK
        String month
        Number amount
    }

    %% Relationships

    USER ||--o{ USER : creates
    USER ||--o{ GROUP : admin_of
    USER }o--o{ GROUP : member_of
    USER ||--o{ EXPENSE : pays
    USER ||--o{ FRIENDSHIP : requests
    USER ||--o{ FRIENDSHIP : receives
    USER ||--o{ DIRECT_SPLIT : pays
    USER ||--o{ DIRECT_SPLIT : shares
    USER ||--o{ DIRECT_SETTLE : requests
    USER ||--o{ DIRECT_SETTLE : confirms
    USER ||--o{ SETTLEMENT : sends
    USER ||--o{ SETTLEMENT : receives
    USER ||--o{ PERSONAL_TRANSACTION : makes
    USER ||--o{ BUDGET : sets

    GROUP ||--o{ EXPENSE : has
    GROUP ||--o{ SETTLEMENT : has