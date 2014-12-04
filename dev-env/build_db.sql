
CREATE DATABASE IF NOT EXISTS memex_sotera;
USE memex_sotera;

DROP TABLE IF EXISTS datawake_org;
CREATE TABLE datawake_org (
  email VARCHAR(300),
  org VARCHAR(300)
);


DROP TABLE IF EXISTS datawake_domains;
CREATE TABLE datawake_domains (
  name VARCHAR(300),
  description TEXT,
  PRIMARY KEY(name)
);


DROP TABLE IF EXISTS datawake_selections;
CREATE TABLE datawake_selections (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  selection TEXT,
  PRIMARY KEY(id),
  INDEX(postId)
);


DROP TABLE IF EXISTS datawake_data;
CREATE TABLE datawake_data (
  id INT NOT NULL AUTO_INCREMENT,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  url TEXT,
  userId TEXT,
  userName TEXT,
  trail VARCHAR(100),
  org VARCHAR(300),
  domain VARCHAR(300),
  PRIMARY KEY(id),
  INDEX(url(30))
);


DROP TABLE IF EXISTS datawake_trails;
CREATE TABLE datawake_trails (
  name VARCHAR(100) NOT NULL,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by TEXT,
  description TEXT,
  org VARCHAR(300),
  domain VARCHAR(300),
  PRIMARY KEY(name,org,domain)
);


DROP TABLE IF EXISTS starred_features;
CREATE TABLE starred_features (
  org VARCHAR(300),
  trail VARCHAR(100) NOT NULL,
  type VARCHAR(100),
  value VARCHAR(1024),
  INDEX(org,trail)
);


DROP TABLE IF EXISTS datawake_url_rank;
CREATE TABLE datawake_url_rank (
  id INT NOT NULL AUTO_INCREMENT,
  url TEXT,
  userId TEXT,
  trailname VARCHAR(100),
  rank INT,
  org VARCHAR(300),
  domain VARCHAR(300),
  PRIMARY KEY(id),
  INDEX(url(30),userId(20),trailname)
);


DROP TABLE IF EXISTS datawake_domain_entities;
CREATE TABLE datawake_domain_entities (
  rowkey varchar(1024),
  INDEX(rowkey(300))
);


DROP TABLE IF EXISTS general_extractor_web_index;
CREATE TABLE general_extractor_web_index (
  url varchar(1024),
  entity_type varchar(100),
  entity_value varchar(1024),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(url(300))
);


DROP TABLE IF EXISTS domain_extractor_web_index;
CREATE TABLE domain_extractor_web_index (
  domain VARCHAR(300),
  url varchar(1024),
  entity_type varchar(100),
  entity_value varchar(1024),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(domain(300),url(300))
);


DROP TABLE IF EXISTS domain_extractor_runtimes;
CREATE TABLE domain_extractor_runtimes (
  domain VARCHAR(300),
  url varchar(1024),
  entity_type varchar(100),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(domain(300),url(300))
);

DROP TABLE IF EXISTS scraping_feedback;
CREATE TABLE scraping_feedback (
  entity_type varchar(100),
  entity_value varchar(1024),
  raw_text varchar (100),
  url TEXT,
  domain varchar (300),
  index(domain(300))
);

DROP TABLE IF EXISTS invalid_extracted_entity;
CREATE TABLE invalid_extracted_entity (
  entity_value varchar (1024),
  entity_type varchar (100),
  domain varchar (300),
  userName TEXT,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(domain(300), entity_type(100), entity_value(100))
);

\q
