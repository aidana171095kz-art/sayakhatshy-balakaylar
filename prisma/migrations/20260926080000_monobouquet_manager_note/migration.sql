-- F3: менеджер жазбасы клиент комментарийінен бөлек сақталады.
-- Бар "comment" деректері өзгермейді (жаңа баған ғана қосылады).
ALTER TABLE "MonobouquetRequest" ADD COLUMN "managerNote" TEXT;
