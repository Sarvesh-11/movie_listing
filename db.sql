CREATE DATABASE movies;
USE movies;

CREATE TABLE user
(
  username            VARCHAR(150) NOT NULL,                
  password            VARCHAR(150) NOT NULL,                
  name                VARCHAR(150) NOT NULL,
  PRIMARY KEY         (username),
  CHECK (LENGTH(username) > 2),
  CHECK (LENGTH(password) > 5)                           
);

CREATE TABLE movie
(
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  username              VARCHAR(150) NOT NULL,  
  name                  VARCHAR(150) NOT NULL,
  rating                INT NOT NULL,
  genre                 VARCHAR(150) NOT NULL,
  release_date          DATETIME,
  CHECK (rating between 0 and 5),
  CHECK (LENGTH(name) > 0),
  FOREIGN KEY (username) REFERENCES user(username)
);

CREATE TABLE cast
(
  id                    INT PRIMARY KEY AUTO_INCREMENT,    
  mid                   INT NOT NULL,
  cast_name             VARCHAR(150) NOT NULL,
  FOREIGN KEY (mid) REFERENCES movie(id)
);