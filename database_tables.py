#!/usr/bin/python

from sqlobject import *
import datetime
from platformer_config import DB_URL

connection = connectionForURI( DB_URL )
sqlhub.processConnection = connection

class Player(SQLObject):
    email = StringCol()
    name = StringCol()
    session = StringCol()
    avatarURL = StringCol()

class Level(SQLObject):
    name = StringCol()
    creator = ForeignKey("Player")
    modified = DateTimeCol()
    startX = IntCol(default = 0)
    startY = IntCol(default = 0)
    bgUrl = StringCol(default = "")
    tilesetUrl = StringCol(default = "")
    goalUrl = StringCol(default = "")
    musicUrl = StringCol(default = "")

class LevelObject( SQLObject ):
    level = ForeignKey("Level")
    type = StringCol()
    x = IntCol()
    y = IntCol()
    width = IntCol()
    height = IntCol()

class Score( SQLObject ):
    class sqlmeta:
        defaultOrder = "completionTime"
    level = ForeignKey("Level")
    player = ForeignKey("Player")
    completionTime = IntCol()
    achievedOn = DateTimeCol()

if __name__ == "__main__":
    Player.createTable()
    Level.createTable()
    LevelObject.createTable()
    Score.createTable()
