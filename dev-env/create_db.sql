
CREATE DATABASE IF NOT EXISTS memex_sotera;
USE memex_sotera;

CREATE TABLE IF NOT EXISTS datawake_org (
  email VARCHAR(300),
  org VARCHAR(300)
);


CREATE TABLE IF NOT EXISTS datawake_domains (
  name VARCHAR(300),
  description TEXT,
  PRIMARY KEY(name)
);


CREATE TABLE IF NOT EXISTS datawake_selections (
  id INT NOT NULL AUTO_INCREMENT,
  postId INT NOT NULL,
  selection TEXT,
  PRIMARY KEY(id),
  INDEX(postId)
);


CREATE TABLE IF NOT EXISTS datawake_data (
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


CREATE TABLE IF NOT EXISTS datawake_trails (
  name VARCHAR(100) NOT NULL,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by TEXT,
  description TEXT,
  org VARCHAR(300),
  domain VARCHAR(300),
  PRIMARY KEY(name,org,domain)
);


CREATE TABLE IF NOT EXISTS starred_features (
  org VARCHAR(300),
  trail VARCHAR(100) NOT NULL,
  type VARCHAR(100),
  value VARCHAR(1024),
  INDEX(org,trail)
);


CREATE TABLE IF NOT EXISTS datawake_url_rank (
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


CREATE TABLE IF NOT EXISTS datawake_domain_entities (
  rowkey varchar(1024),
  INDEX(rowkey(300))
);


CREATE TABLE IF NOT EXISTS general_extractor_web_index (
  url varchar(1024),
  entity_type varchar(100),
  entity_value varchar(1024),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(url(300))
);


CREATE TABLE IF NOT EXISTS domain_extractor_web_index (
  domain VARCHAR(300),
  url varchar(1024),
  entity_type varchar(100),
  entity_value varchar(1024),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(domain(300),url(300))
);


CREATE TABLE IF NOT EXISTS domain_extractor_runtimes (
  domain VARCHAR(300),
  url varchar(1024),
  entity_type varchar(100),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(domain(300),url(300))
);

CREATE TABLE IF NOT EXISTS scraping_feedback (
  entity_type varchar(100),
  entity_value varchar(1024),
  raw_text varchar (100),
  url varchar(1024),
  domain varchar (300),
  org VARCHAR(300),
  index(org(300),domain(300))
);

CREATE TABLE IF NOT EXISTS invalid_extracted_entity (
  entity_value varchar (1024),
  entity_type varchar (100),
  domain varchar (300),
  org VARCHAR(300),
  userName TEXT,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  index(org(300),domain(300), entity_type(100), entity_value(100))
);

CREATE TABLE IF NOT EXISTS trail_based_entities (
  org VARCHAR(300),
  domain varchar(300),
  trail varchar(100) NOT NULL,
  entity varchar(1024),
  google_result_count varchar(100),
  index(org(300), domain(300), trail(100))
);

CREATE TABLE IF NOT EXISTS irrelevant_trail_based_entities (
  org VARCHAR(300),
  domain varchar(300),
  trail varchar(100) NOT NULL,
  entity varchar(1024),
  google_result_count varchar(100),
  index(org(300), domain(300), trail(100))
);

CREATE TABLE IF NOT EXISTS trail_term_rank (
  org VARCHAR(300),
  domain varchar(300),
  trail varchar(100),
  url varchar(1024),
  title varchar(1024),
  rank DOUBLE,
  pageRank INT,
  removed INT DEFAULT 0,
  index(org(300), domain(300), trail(100), url(1024))
);

CREATE TABLE IF NOT EXISTS entities_on_url (
  org VARCHAR(300),
  domain varchar(300),
  trail varchar(100),
  url varchar(1024),
  entity varchar(1024),
  relevant INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trail_entities_contents(
  url varchar(1024),
  html MEDIUMBLOB,
  index(url(1024))
);

exit;
