-- use this script when copying over the results from what's been running on the server
alter table pings add column created_at_str varchar;
update pings set created_at_str = created_at;
alter table pings drop column created_at;
alter table pings rename column created_at_str to created_at;
