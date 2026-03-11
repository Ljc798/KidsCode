-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE "Concept" AS ENUM ('BRANCH', 'LOOP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KnowledgeLanguage" AS ENUM ('CPP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Mini games
CREATE TABLE IF NOT EXISTS "MiniGame" (
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "blurb" TEXT NOT NULL,
  "requires" "Concept" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MiniGame_pkey" PRIMARY KEY ("slug")
);

-- Knowledge base articles
CREATE TABLE IF NOT EXISTS "KnowledgeArticle" (
  "slug" TEXT NOT NULL,
  "language" "KnowledgeLanguage" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "contentMd" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX IF NOT EXISTS "KnowledgeArticle_language_order_idx"
  ON "KnowledgeArticle" ("language", "order");

-- Seed: mini games (safe to re-run)
INSERT INTO "MiniGame" ("slug","title","emoji","blurb","requires","isActive","createdAt","updatedAt")
VALUES
  ('treasure-choices','宝箱三选一','🧰','用分支帮角色做选择，拿到最大的星空币奖励。','BRANCH',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('monster-avoid','怪物躲躲躲','👾','判断前方障碍，决定跳跃还是绕路。','BRANCH',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('weather-outfit','天气穿搭师','⛅️','根据天气和温度选择合适的装备。','BRANCH',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('star-collector','星星收集器','⭐️','用循环重复动作，尽可能多收集星星。','LOOP',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('robot-gardener','机器人园丁','🤖','用循环种下整齐的花园，越整齐分越高。','LOOP',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('drum-beat','节奏小鼓手','🥁','循环播放节奏，挑战更长的节拍序列。','LOOP',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Seed: C++ knowledge (safe to re-run)
INSERT INTO "KnowledgeArticle" ("slug","language","title","summary","contentMd","order","isPublished","createdAt","updatedAt")
VALUES
  (
    'cpp-hello',
    'CPP',
    '第 1 课: Hello World',
    '认识 main、cout、换行。',
    '# Hello World\n\n- main 是程序的入口。\n- cout 用来输出。\n\n```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << \"Hello KidsCode!\" << endl;\n  return 0;\n}\n```\n',
    10,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'cpp-if-else',
    'CPP',
    '第 2 课: 分支 if / else',
    '会做判断，程序会“选择”。',
    '# if / else\n\n当条件为真走 if，否则走 else。\n\n```cpp\nint score = 85;\nif (score >= 60) {\n  cout << \"PASS\" << endl;\n} else {\n  cout << \"TRY AGAIN\" << endl;\n}\n```\n',
    20,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'cpp-for-loop',
    'CPP',
    '第 3 课: 循环 for',
    '重复做一件事，越写越省力。',
    '# for 循环\n\n```cpp\nfor (int i = 0; i < 3; i++) {\n  cout << \"STAR\" << endl;\n}\n```\n',
    30,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;

