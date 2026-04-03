import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

public class SuperPay {

    /**
     * 支付拉单
     */
    public void pay() {
        String url = "https://hixrs.ibpee.com:13758/api/collecting/pay";

        Map<String, Object> data = new HashMap<>();

        // 商户号，在商户后台查看
        data.put("merchant_on", "59103199");
        // 订单金额
        data.put("amount", 100);

        // 商户订单号、最大32位
        data.put("order_sn", makeOrderSn("TS"));
        // 异步通知地址
        data.put("notify_url", "http://youhoust.cn");

        // 用户标识
        data.put("uid", 1);

        // 同步跳转地址、可在商户后台配置，也可在此处传递
        // data.put("return_url", "http://youhoust.cn");

        // 商户扩展参数，回调通知时原样返回
        // data.put("extend", "");

        // 渠道类型编码、具体商户后台可查看
        // data.put("channel_type_code", "");

        // 渠道编码、具体商户后台可查看
        // data.put("channel_code", "");

        // 备注
        // data.put("remark", "");

        String key = "8mt-g0DfGw8efGPkdt79iEctm-cwsPEQ";

        String sign = signature(data, key);
        data.put("sign", sign);

        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");

        try {
            Map<String, Object> result = request(url, data, "POST", headers, 10);
            System.out.println(result);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 查单
     */
    public void query() {


        Map<String, Object> data = new HashMap<>();
        // 商户号，在商户后台查看
        data.put("merchant_on", "59103199");
        // 商户订单号
        data.put("order_sn", "TS202506271349282383951909");

        String key = "8mt-g0DfGw8efGPkdt79iEctm-cwsPEQ";

        String sign = signature(data, key);
        data.put("sign", sign);
        String url = "https://hixrs.ibpee.com:13758/api/collecting/pay?merchant_on=59103199&order_sn=TS202506271349282383951909&sign=" + sign;

        try {
            Map<String, Object> result = request(url, data, "GET", new HashMap<>(), 10);
            System.out.println(result);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 回调通知
     *
     * @return
     */
    public String callNotify() {
        // 回调数据
        Map<String, Object> data = null;// 从post请求中获取数据

        // 商户密钥，商户后台可查看
        String key = "8mt-g0DfGw8efGPkdt79iEctm-cwsPEQ";

        // 回调返回的签名字符
        String signString = (String) data.get("sign");

        boolean result = verifySignature(data, signString, key);
        if (result) {
            // 验证成功，处理您的业务逻辑
            return "success";
        }
        return "fail";
    }

    /**
     * 发起请求
     *
     * @param url
     * @param data
     * @param method
     * @param headers
     * @param timeout
     * @return
     * @throws Exception
     */
    protected Map<String, Object> request(String url, Map<String, Object> data, String method, Map<String, String> headers, int timeout) throws Exception {
        URL obj = new URL(url);
        HttpURLConnection con = (HttpURLConnection) obj.openConnection();

        con.setRequestMethod(method.toUpperCase());
        con.setConnectTimeout(timeout * 1000);
        con.setReadTimeout(timeout * 1000);

        for (Map.Entry<String, String> entry : headers.entrySet()) {
            con.setRequestProperty(entry.getKey(), entry.getValue());
        }

        if (method.toUpperCase().equals("POST") || method.toUpperCase().equals("PUT")) {
            con.setDoOutput(true);
            String jsonInputString = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(data);
            try (OutputStream os = con.getOutputStream()) {
                byte[] input = jsonInputString.getBytes("utf-8");
                os.write(input, 0, input.length);
            }
        }

        int responseCode = con.getResponseCode();
        BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
        String inputLine;
        StringBuilder response = new StringBuilder();
        while ((inputLine = in.readLine()) != null) {
            response.append(inputLine);
        }
        in.close();

        Map<String, Object> result = new HashMap<>();
        result.put("status_code", responseCode);
        result.put("response", new com.fasterxml.jackson.databind.ObjectMapper().readValue(response.toString(), Map.class));

        return result;
    }

    /**
     * 生成签名
     *
     * @param data
     * @param appSecret
     * @return
     */
    protected String signature(Map<String, Object> data, String appSecret) {
        Map<String, Object> sortedData = new TreeMap<>(data);
        StringBuilder signString = new StringBuilder();
        for (Map.Entry<String, Object> entry : sortedData.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().toString().isEmpty() && !entry.getKey().equals("sign")) {
                signString.append(entry.getKey()).append("=").append(entry.getValue()).append("&");
            }
        }
        signString.append("key=").append(appSecret);
        return md5(signString.toString()).toUpperCase();
    }

    /**
     * 校验签名
     *
     * @param data
     * @param signString
     * @param key
     * @return
     */
    protected boolean verifySignature(Map<String, Object> data, String signString, String key) {
        return signature(data, key).equals(signString);
    }

    /**
     * 获取一个交易编号
     *
     * @param fix
     * @return
     */
    protected String makeOrderSn(String fix) {
        String orderIdMain = fix + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + (int) (Math.random() * 10000) + (int) (Math.random() * 10000);
        int orderIdLen = orderIdMain.length();
        int orderIdSum = 0;
        for (int i = 0; i < orderIdLen; i++) {
            orderIdSum += Character.getNumericValue(orderIdMain.charAt(i));
        }
        return orderIdMain + String.format("%02d", (100 - orderIdSum % 100) % 100);
    }

    /**
     * MD5 加密
     *
     * @param input
     * @return
     */
    private String md5(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("MD5");
            byte[] messageDigest = md.digest(input.getBytes());
            BigInteger no = new BigInteger(1, messageDigest);
            String hashtext = no.toString(16);
            while (hashtext.length() < 32) {
                hashtext = "0" + hashtext;
            }
            return hashtext;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void main(String[] args) {
        SuperPay pay = new SuperPay();
        // 支付
        pay.pay();

        // 查单
        // pay.query();
    }
}
