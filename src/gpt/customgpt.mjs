async function getInternetTimestamp() {
  try {
    const response = await axios.get("http://worldtimeapi.org/api/ip");
    const data = response.data;
    const internetTime = data.unixtime;
    console.log(data.utc_datetime);
    return internetTime;
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function getAnswerFromFreeOpenAI(q, model){


  const autorization_data  = {
    "sashaloko@inkworlds.com" : 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJzYXNoYWxva29AaW5rd29ybGRzLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7InBvaWQiOiJvcmctV0xZQ0NLWVhyY0tyVDk2Qm51d2ZmZGc5IiwidXNlcl9pZCI6InVzZXItMUd2SG5WTE5EbTJqcjZ1OVlyQmxmQlQ5In0sImlzcyI6Imh0dHBzOi8vYXV0aDAub3BlbmFpLmNvbS8iLCJzdWIiOiJhdXRoMHw2NTlmODVlMGI3M2Q5MjUzYjYxZWFmYWUiLCJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSIsImh0dHBzOi8vb3BlbmFpLm9wZW5haS5hdXRoMGFwcC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzA0OTU3OTQ0LCJleHAiOjE3MDU4MjE5NDQsImF6cCI6IlRkSkljYmUxNldvVEh0Tjk1bnl5d2g1RTR5T282SXRHIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBtb2RlbC5yZWFkIG1vZGVsLnJlcXVlc3Qgb3JnYW5pemF0aW9uLnJlYWQgb3JnYW5pemF0aW9uLndyaXRlIG9mZmxpbmVfYWNjZXNzIn0.XbTsZIJlqUXWc9NU3-gnH7Yh1cBtCq-mX5gsdHJtH1Xt0Itl9Kr81kbo2wzTaDZA245GylLdG7j488vamFRz6ErNCqolR7LMWAmRvwf_FPrIW1Ig0DhWojQKOKLZJQwMHX4LAAXGwS5Pm3XNaSIpNZI1daxVaY_AobtncbBVqb7FspEaJtQgmRMqyxEk9O6q1Dt3m4xL7jhiT54q5tboPHf2MipdQgScAeb8U0AHitib2S-GyNa6EotZxTS6pfQt_mtougTsWxjwQoznWNkKPOKArM1MYBVR4CJCkqxAXUCN422b5FM2cD4k5SvzCV5WOLShbT9Xbuxv4AIeEoew8A',
    "cemenikol@rmviking.com": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJjZW1lbmlrb2xAcm12aWtpbmcuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsicG9pZCI6Im9yZy05djV3MEZySDUxTk5qclM3TExDVWZHQUMiLCJ1c2VyX2lkIjoidXNlci1XcWV4REtpeVc3dEVwMnExMnptSW1zS1UifSwiaXNzIjoiaHR0cHM6Ly9hdXRoMC5vcGVuYWkuY29tLyIsInN1YiI6ImF1dGgwfDY1OWY4Yjg1YjczZDkyNTNiNjFlYjQyYSIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkub3BlbmFpLmF1dGgwYXBwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3MDQ5NTQ4MTYsImV4cCI6MTcwNTgxODgxNiwiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvcmdhbml6YXRpb24ud3JpdGUgb2ZmbGluZV9hY2Nlc3MifQ.zoUZxw8pOidU0wZwRk3hdlyylWi_Jj6FOon0XafciSB05WtYaVXhgR9t30YyyE7JQmxMlosWJmCFz4l9qlAYZATk1-p3YWtHLX9hX2vjb7OhvIzgYqJzo_yknYkBrKC1MWoLmCh55WDqu_8BaA8cw8hnrwsbkjpUKTKSnYqY_AGi7_NGkSYOOCr1jQy3OtzNGJ0oKDfrfzFeU2ivePOGc88rX5BmbFRw-xQtW-HkVQ57GdFErZ4-yA4YrlmlRuGv9KNReNloyDmddM4pKyh55sohEsVF4fNcGPgJj_i3LnfOSgQVaVHlXnTVJYC5OSYoSHAjHX8j9tyRfypwlYhdCQ",
    "pupsik2189@aboranorb.com": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJjZW1lbmlrb2xAcm12aWtpbmcuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsicG9pZCI6Im9yZy05djV3MEZySDUxTk5qclM3TExDVWZHQUMiLCJ1c2VyX2lkIjoidXNlci1XcWV4REtpeVc3dEVwMnExMnptSW1zS1UifSwiaXNzIjoiaHR0cHM6Ly9hdXRoMC5vcGVuYWkuY29tLyIsInN1YiI6ImF1dGgwfDY1OWY4Yjg1YjczZDkyNTNiNjFlYjQyYSIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkub3BlbmFpLmF1dGgwYXBwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3MDQ5NTQ4MTYsImV4cCI6MTcwNTgxODgxNiwiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvcmdhbml6YXRpb24ud3JpdGUgb2ZmbGluZV9hY2Nlc3MifQ.zoUZxw8pOidU0wZwRk3hdlyylWi_Jj6FOon0XafciSB05WtYaVXhgR9t30YyyE7JQmxMlosWJmCFz4l9qlAYZATk1-p3YWtHLX9hX2vjb7OhvIzgYqJzo_yknYkBrKC1MWoLmCh55WDqu_8BaA8cw8hnrwsbkjpUKTKSnYqY_AGi7_NGkSYOOCr1jQy3OtzNGJ0oKDfrfzFeU2ivePOGc88rX5BmbFRw-xQtW-HkVQ57GdFErZ4-yA4YrlmlRuGv9KNReNloyDmddM4pKyh55sohEsVF4fNcGPgJj_i3LnfOSgQVaVHlXnTVJYC5OSYoSHAjHX8j9tyRfypwlYhdCQ",
    "bobr9423@africanlaughter.com": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJib2JyOTQyM0BhZnJpY2FubGF1Z2h0ZXIuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsicG9pZCI6Im9yZy1zZDRGV25WYUQxM1N0U0l4SjRkQU1aSUoiLCJ1c2VyX2lkIjoidXNlci12eTU5SmhMd0dHZlNNeTRUNDZXbVZFZnQifSwiaXNzIjoiaHR0cHM6Ly9hdXRoMC5vcGVuYWkuY29tLyIsInN1YiI6ImF1dGgwfDY1OWY4ZWQxMGY3N2MwZjBjYjE5OWI1MyIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkub3BlbmFpLmF1dGgwYXBwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3MDQ5NTU2NDQsImV4cCI6MTcwNTgxOTY0NCwiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvcmdhbml6YXRpb24ud3JpdGUgb2ZmbGluZV9hY2Nlc3MifQ.RiL8fy_D1gK_GbX7QJqRBTg1mYoaFC8GFHcWl77oh136-E0a1dmQtt7LiJmsCPUTScK623e636h6ZIP05cu-JrkjPgG4s0JhriwCQISIAicQrF9GKBXvpImFPos6IfEs30SPxCcyafWoHJ86Gf8B61ecsYqePLRJH07pWWxcSIbR9-U8GIv9_qMYGHjb18ickaiIVYJ4J7ZqS7izYyAWygngZwCjm_b2ejqXyYKXnsn1lJZq8q8RreZMjQuLBeqWSZL9MgmmgaaSUVUDAm20Xjv9DLRykZxBJoXKcPsac-vma2E64-SN3h0n_bihsFgiQV2BVwZI4UrZqa8kymiACw",
    "ghst@parkernorfolk.com": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJnaHN0QHBhcmtlcm5vcmZvbGsuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsicG9pZCI6Im9yZy1XZ1Z4S2NvYUFyem1nQ0gyYktvTlA2aXMiLCJ1c2VyX2lkIjoidXNlci1aNWFRd014V1MzT2JGaDZUeFh4bE85aW8ifSwiaXNzIjoiaHR0cHM6Ly9hdXRoMC5vcGVuYWkuY29tLyIsInN1YiI6ImF1dGgwfDY1OWY4ZjdiYjczZDkyNTNiNjFlYjdiOSIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkub3BlbmFpLmF1dGgwYXBwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3MDQ5NTU3OTgsImV4cCI6MTcwNTgxOTc5OCwiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvcmdhbml6YXRpb24ud3JpdGUgb2ZmbGluZV9hY2Nlc3MifQ.NOFEXZMBus02tuMAcFuuliw2fulwqsStWDq0JlKCSp6bdqns6K_kxlpqdZpZWTKvnNpUn6MufUnRFupTJGnM9McE4_LDuU7ccl1s91kM0KZ3q9nd7_qQyJFlbO5BsIcX77XmCw7MOI1f0v85f6grp5Z7kwAQALy42gjW5fCkIT3xX6KGX7PEHkXoi3CBFE3O58DJhxAUXv153UG_KHbEfgtE0H6IE9mQOAJZzsu73WMus8ssj7hyK1N753CT04a_GFdrroh95lkqwbz0daEICJtxc0NwJKrSAij8ktPaIVmnCGZWR0zkUYRU7C5USC7wfD22mBxRjLxVPJHoFKxMpA",
    "mtrhed67@inkworlds.com": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJtdHJoZWQ2N0Bpbmt3b3JsZHMuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL2F1dGgiOnsicG9pZCI6Im9yZy1VdzgwVGlFajg0ZU8wQUlsN0xnMnpINUkiLCJ1c2VyX2lkIjoidXNlci1EOWdWOVdmak1nUjhXNDJIR21EYVpzbFEifSwiaXNzIjoiaHR0cHM6Ly9hdXRoMC5vcGVuYWkuY29tLyIsInN1YiI6ImF1dGgwfDY1OWY5MDMwYjJlMzlmYzUyMTAxZWJiNyIsImF1ZCI6WyJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxIiwiaHR0cHM6Ly9vcGVuYWkub3BlbmFpLmF1dGgwYXBwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3MDQ5NTU5OTMsImV4cCI6MTcwNTgxOTk5MywiYXpwIjoiVGRKSWNiZTE2V29USHROOTVueXl3aDVFNHlPbzZJdEciLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIG1vZGVsLnJlYWQgbW9kZWwucmVxdWVzdCBvcmdhbml6YXRpb24ucmVhZCBvcmdhbml6YXRpb24ud3JpdGUgb2ZmbGluZV9hY2Nlc3MifQ.E5YdO8mG5ymt33x3_vz5v42TMi151bS5gXcPziaPMemqXQQwE5cEOH4N1U517ckUjEX9nRXfPsjf_BR7mvL7fe2zuvZTfqexn57JRHcEiNRpvLYADtelNG8AaV20kwRKIEWi3EKbJ-9Bq66yo7vwsLNw7eo7nt1NOf236AB5qkf1lOJ-mONswGtPnXF_SjMfSjlE5A6acI47AYlIO4x47O-OnANcpBHzazRyOL5_Oc3-yYNxwgMwyO9gHvYecopUGZW_jbF3mub3tu8tgC8k6lxC_7V-wXe0sPYTC6vl62qRGXox21seSr6gJJubd8rHc0KnMrHDI_Fpc2ON3JQi4Q"
    };
// Parse the JSON data

// Select a random value
const keys = Object.keys(autorization_data);
const randomKey = keys[Math.floor(Math.random() * keys.length)];
const randomValue = autorization_data[randomKey];




const url = 'https://chat.openai.com/backend-api/conversation';

const headers = {
  'accept': 'text/event-stream',
  // 'Accept-Encoding': 'gzip, deflate, br',
  'accept-language': 'en-US',
  'authorization': randomValue,
  'content-type': 'application/json',
  // 'Cookie':'__Host-next-auth.csrf-token=c1c325e31c4033ecdbce941aba9e8dec0a80695ee652de8c14f3aa2e9ba4b246%7C92d6b78b5e47605c1f3f5e410e80f43e1d7afc5d4e3932d64126c6537e2321f4; ajs_anonymous_id=anon-cgpt-803fb8bc-9c8a-48af-96ad-a940364936ff; _cfuvid=DkQwCD.MDMjjxVgEIW78ZgTh1beCPaf8SO1EB.BuUyM-1704301466974-0-604800000; ajs_anonymous_id=anon-cgpt-803fb8bc-9c8a-48af-96ad-a940364936ff; cf_clearance=frKuP9dvBa2kE_BlV1bQTwNPIvk8cBv9w37VtFFGFTo-1704301468-0-2-7e90ed69.2f1e861a.e298f10-250.2.1704301468; _cfuvid=msyMwXwAZuG00hKVTgsmNeCiXh0aFQ.rQ5WXX.gQqWc-1704301489026-0-604800000; cf_clearance=PT7xCmvs6KDnoPFycTDUK5rbr0yUO2.OxAq2x.9.l_g-1704301489-0-2-7e90ed69.2f1e861a.e298f10-0.2.1704301489; ajs_user_id=user-kldxx0sYnyv7h3GLxbb1SsNG; __Secure-next-auth.callback-url=https%3A%2F%2Fchat.openai.com; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..44bc1B4PCTEtK4zM.n5oTcXW-4CnQrttYJ5FuH2O7j7f6CAQMGbEOxA27J8pSPwuRebC2BQRxB9SNx0k3YPY-ImpBNH77lZpMIR1qoHig0u1i3M3GHWe4m2Djyw8wqTWjr2hPg3EtTuxfevpXNnFjCsVHY0Gmxt9B0mvSCXIrwZhmomGJZWeANbV12_SAcNQn6f7Dd7qrSK0kUK8XqTRMpG1F77ee1GrlKTiZhq9hKAsLuYO-uJlOH47G6sM_POlGHq8umiC58hHtlqdYhkYXBT8EzGvTl0QTG3jTDPARnqRJAGzPKTx6C9xFR7t88vKqPFAxLIj6FXi25sDkP6IdGmu8bhbm2lzgpal6F7klJosHgg6f6SfQL605WRSJi76k7HiMnbrp8fp6Ho8sCf2oizqfxbvJMYJdmOq885s_JWd9GCjDwv-7R4j-oIQCWtsKqUyKelfGAyjaj8O_kNyoU_el__yjAR_-3450qK5OsHRBNgt9CVZYK-HjYVaSJkZk4kl7LNiVugiZeHuoSQLgN-xacI2s9brJ0EKDCXbNQsMqKbKvOasTgITHyMia8YOU6CpysFbzy2lpGwDEVM_ZfHMoG6MGOtCnSMnZdONgxJRSLLg5Eyz3YFQEbvqYJU_WrUMXxQVMG-Bbc_3Wcq5IjO5AyipWD0hoe3WsxgqeZAh0nvKfkOFjamzCFJImBahNUx6dH8jdCDkiEacng5HW-ma4fTxyHfuU8KX4Sgc55kNuk5JqCwJ7fU7RY5Gt24DVa8bJtJfjwVez1qbR-ssisbHU60zyDUXzgcFoPWtBgWeNJp8eTJfnQSxuTCcPbnxU7ZAnuTLQCsJeWNg0Zy2VmlCZAPppwVlhJDL7_kWP_Bl4Y97tZh-Eev8Gf0NpLpfoHPXqVPEEq7OxCv2gC6Q_zbqy78n6eqon_OQeWRhcXZ1i6SB_1-MLcvxZdbaiNhP0T1uRKPwtNYU5mMnP7Xrl6jooiIDQm6C5X6XRUxeluh7Ci21_QytS1jzFCHBfh7gZN-N_8dAltEDwrDdggIt7ulEyb6hnMLLqwHQI5WZPaSMdS91HxVt6ySqMA2QRGtWmiNElAed-MVQ1-voSViUaZgpgNZCiliJic9a5vV9Q8E5sJcExljKxBIJwzg9b6xlhNeZcNmpoPV8vgLqy7NFcCPs3wjxEu3OUrseak0vylGeWYxsfgwEA_NrpYRe6PxYxH2qTZxMZZpVVn_qGwnLWM4Fh8JhvGhzekWsEPCPCkV4cPo8b0EbuPGRx2TNmAw3B-A7o1ndeAiba_rCIzlUBLPokQ2rcgcr7j3uC_d4X0HJb1Fk1cZvzaAWjpCwzCQF-dpXmZqZHtkYpvXEQIqI7ILkr-l6GVuvBvaVzds5EMm-j2KtombmupXnZaWKw46lyT1emRiqspdk6fF5J5okYmo8-jlnq135Il0yq3bVt06qpF-w-GkDTQHIudvNEyEwkrpcEZsC8k0FutK-8e9b9ibc-8GcXoHIc1lKWgnHK9Ntso2q8U0OfDXggAClIgCX_ebqPZ3ARiSmTC24FRGozIMBE6Ll4d0uxvaj20-lRrAGnKAOWhjFZDWNlJI8L1JqTSvH58LEtTEMePleZAWzp-fGL2ZhVAkHKtSuiQzvH2WiReTEKOXNfRaIMbXNvBE9h63lpZxVumXfvJ7erQlyHxSKJPI-NZVGSst87alXPysCTuhi9uNe24Vwl8GsgcUJrFuYzrzXKtCgrSdf8m3yiPFM4jTKHfY9UIjiBVGGQbspCO6PWOyIndNPEpIDIAtagIZqGpw57Glwm1wEpux_HcXQ6avlf3Kzw_VP0r5LpjtdDdCYo4BW3bsBY4juODy89v_1shIqS2CSBIqfO0M7FUHCyKOap5lX0mhWjREWcpdbeZ66BnLnID_IC87y1xFpP4wN2an2UOCS7eEwq5oLQr6CCJ7Rwr4dn-Y3By61ZHKJ5HHCIDh0dtkRx5E05UBGw3Fu7DDE7bSM52JJ6z2JkPW5XmNL6X5vwuf8mMPEnDT4hivj9B80H7ZSScrHlS0wxnLgLgbcWJ_IJ2qgmKD4NsXOqMo0H45edBqe3CbQp0VdLpnZKUGvrQRsEnGK2fbQeUafzdsTNT6F2ja8jj0dgMDCL-Q0-advqtLEYbweNZsmAQwjl2XwaeAdesCmVD4gOxKwj3X9a6pi6EVCN2aZ0y1nquUOe9y3837_WTMwq8Uzx18prg3TBwVfJrUFta8_qm9dso67a7ksQDh3Dv1Q_YyPuuHZBjp2ZOPaTEZ-bEb4ANLp86ISEA-6SgPMhk_nXerVwu2jGjfV3_FT9c48hbnUJ0Pejp9AIPOSnqdm4QmqnpVF69Y1udl8S7JEs7KDSpbkb33tn5DxzRcez8SyJgD286ArbDSt-b6u5ho2zYr0RK7NcSXvMoeWqjzsY21meyxjIMFu8KnqUnEZNEBuD--na3jjE_FHHUdunwGxMhSrqrI7exzO9aaJh1UwfvZb1UoWjaADz12cILQNZGpzOZWd6ff2_bFnz2uXjO1VsrlmyxGXwbwWbA3KXJRThNqXifUfwdF8ZqPgou9OIrQVKFiCxgiKnWFYqDFbphJGjwlsrppLzXCCZQlmiyc7ss5-55o8m9AXS6FQJw6qmYRnz9KJ44B0ywoCW2MHW40kVT_dASiR1IhgKTQXEVgltadIRd13h4NaLJ8yNfg3QaiyHQcUpHwi2kyeQEuyClvqnXF9G3zcYfnhwEhLL2Gh-YTlBRcUUjk8PLU8r_N01N6rnQ5H-14E_H90kniwcVYwweBFA8qdOUz7ejwRBGneDKS7xbdXYZUOp.07PU0rDbv4Og12Oz2zRifw; intercom-session-dgkjq2bp=VlYvK2VwTmRMV21JNDVvTHRnSmZscmVFVlBrb3FCcU50UEJuRGo5ZDhaZnV2dWdJM2plM2ZSbmZQUXhTVDU4WC0tQkp2MkRxd3FyQUs5QlhJL3VGd2NtQT09--0ed6e0be6e405473dca1d8dcb6e2eb07eb9a8306; intercom-device-id-dgkjq2bp=339f2f1b-af26-4384-a5d8-a3aaf4970b51; __cf_bm=aZ89jbZtvFYCwqxQiL70Qcj5kJf6UxKooMj3EEcQFs4-1704305201-1-Afq77SFb6G9UK2Yyj8F1Z/NPXvSixwFCJJCS0AKyp6QmvjdZQZYVW3RKE02m4Mv63dyo8LFpxrcjk0oHdzsz+rU=; __cflb=0H28vVfF4aAyg2hkHEuhVVUPGkAFmYvk8yCvCfs3TqP; _uasid="Z0FBQUFBQmxscUsxWEZybmd1aGlCMlNhbVBPcTNNMFo2NHhBcVR5Y1JRSndhVFNzTDhRZEpjU0w0ck5FeGd0TUxmVjcxVkFlWDlEaW5nbU0wQ0pjMGluSUVZR0VzV3VuQVRlTG1IZnY0VzlYamNVd3NoR0dKeEtLZnQ2N29fSlVFUTVIblI5d1RKZldpNXQ0cWtZQlZaQmJKMHBINmtVc2gybWJLUXZ6elNuR2JzTW1LVktIX2FhZlkyYXBlRm0ybzd3Q0dpdWxWc3hDeVd4dG5vUGx0V0lrVWFSbXNtdVpyQmhKN3luMkpERXB1OXdsc0hBY0cxbE1hT01QRnViYXhPR0xpb1VaRHpOZ1J0RElJWFNfX3Rzb25xaHd2SnlVTE4zb0pPMFZXQkRqUjdJRjRvam1ZRTdyOWl2RkdzV19qVzZrSlAxODVQRnlZNUJjWGI1OU00Rm8zenhValFOb1Z3PT0="; _dd_s=rum=0&expire=1704306501350',
//   'Origin': 'https://chat.openai.com',
// 'Referer': 'https://chat.openai.com/',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};


const data = {
    "action": "next",
    "messages": [
        {
            "id": "aaa296d8-befa-48f4-805c-c25436fdc528",
            "author": {
                "role": "user"
            },
            "content": {
                "content_type": "text",
                "parts": [
                  q
                ]
            },
            "metadata": {}
        }
    ],
    "parent_message_id": "aaa15d3a-c722-47a3-9f29-6eebd37b1253",
    "model": model,
    "timezone_offset_min": 480,
    "suggestions": [
        "Write a text asking a friend to be my plus-one at a wedding next month. I want to keep it super short and casual, and offer an out.",
        "Design a database schema for an online merch store.",
        "Explain what this bash command does: \"cat config.yaml | awk NF\"",
        "Give me 3 ideas about how to plan good New Years resolutions. Give me some that are personal, family, and professionally-oriented."
    ],
    "history_and_training_disabled": false,
    "arkose_token": "83717a74a12689e21.0792203502|r=us-west-2|meta=3|metabgclr=transparent|metaiconclr=%23757575|guitextcolor=%23000000|pk=35536E1E-65B4-4D96-9D97-6ADB7EFF8147|at=40|sup=1|rid=32|ag=101|cdn_url=https%3A%2F%2Ftcr9i.chat.openai.com%2Fcdn%2Ffc|lurl=https%3A%2F%2Faudio-us-west-2.arkoselabs.com|surl=https%3A%2F%2Ftcr9i.chat.openai.com|smurl=https%3A%2F%2Ftcr9i.chat.openai.com%2Fcdn%2Ffc%2Fassets%2Fstyle-manager",
    "conversation_mode": {
        "kind": "primary_assistant"
    },
    "force_paragen": false,
    "force_rate_limit": false
};

const options = {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data),
};
try {
    // console.log(randomValue);
    const response = await fetch(url, options);

    // Uncomment the next line if you want to parse the response as JSON
    // const result = await response.json();

    // Use response.text() to get the response body as text
    const resultText = await response.text();
    
    // console.log(resultText);
    const dataList  = resultText.split('\n\ndata: ');
    const answer = JSON.parse(dataList[dataList.length - 3]).message.content.parts[0];
    // console.log(answer);
    return answer;
    // console.log(resultText);
  } catch (error) {
    console.error('Error:', error);
    return undefined;
  }
}



const DEFAULT_MESSAGE = 'Hello, client. I can do this perfectly because I have skills as well as experiences.'
export default class MyGPT{
  constructor(model){
    this.model = model || "gpt-3.5-turbo";
    this.fnPrompt = e=>e;
  }
  setPrompt(fn){
    this.fnPrompt = fn;

  }
  setDefault(message){
    this.default = message;
  }
  setKnowledgeBase(data){
    this.base = data;
  }
  async prompt(prompt_text){
    try{
      const text = await getAnswerFromFreeOpenAI(this.fnPrompt(prompt_text), this.model)
      return text;

    } catch(e){
      return this.default || DEFAULT_MESSAGE;
    }

  }
  getAnswer(question){
    return 'Sure, I can.'
  }
}