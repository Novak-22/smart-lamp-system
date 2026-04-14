#调photo api，返回bucket, objectname，再通过fileserver api拿图片

curl --location 'http://localhost:3001/api/lamp/photo' \
--header 'Content-Type: application/json' \
--data '{ "on": true }'

#从fileserver拿照片
curl --location 'https://sensejupiter-test.sensetime.com/l1/fileserver/v1/view?objectname=encrypt%2Fskill%2FL1WP00BC23M4600076%2F1775792897966.jpeg' \
--header 'AUTH-TOKEN: eyJhbGciOiJIUzUxMiJ9.eyJhcHAiOiJMSUdIVF9BUFAiLCJzdWIiOm51bGwsInJvbGUiOiJVU0VSIiwiaGVhZEltZyI6bnVsbCwiY3JlYXRlZCI6MTc3NTgwODc4NjE5Nywic291cmNlIjoiQVBQIiwidmVyc2lvbiI6MzcyMDg5ODExOTc3NTc0ODA5NywibmFtZSI6bnVsbCwiaWQiOiI0ODMxNDIzNzI1ODQzMzQ1ODY0IiwidXNlclR5cGUiOiJVU0VSIiwiZW5jIjp0cnVlLCJleHAiOjE3NzY0MTM1ODYsInN0YXR1cyI6IkFDVElWRSJ9._u_SPUnfdVGcscp1Uw8ZXHeHbE4TIZTU0Cr54LmOayo-zyPN7GdyndddENYRkpqNDFgb-_lfUIB5fwtGmmRJeA' \
--header 'SOURCE: APP'