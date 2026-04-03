<?php

class SuperPay
{

    /**
     * 商户号，在商户后台查看
     * @var string
     */
    protected $merchant_on = '59103199';

    /**
     * 商户密钥，商户后台Api管理下查看
     * @var string
     */
    protected $merchant_key = '8mt-g0DfGw8efGPkdt79iEctm-cwsPEQ';

    /**
     * 支付拉单
     * @return void
     * @throws Exception
     */
    public function pay()
    {
        $url = 'https://hixrs.ibpee.com:13758/api/collecting/pay';

        $data = [
            // 商户号，在商户后台查看
            'merchant_on' => $this->merchant_on,

            // 订单金额
            'amount'      => 100,

            // 商户订单号、最大32位
            'order_sn'    => $this->makeOrderSn(),

            // 异步通知地址
            'notify_url'  => 'http://youhoust.cn',

            // 同步跳转地址、可在商户后台配置，也可在此处传递
            // 'return_url'=>'http://youhoust.cn',

            // 商户扩展参数，回调通知时原样返回
            // 'extend'=>'',

            // 渠道编码、具体商户后台可查看
            // 'channel_code'=>'',

            // 渠道类型编码、具体商户后台可查看
            // 'channel_type_code'=>'',

            // 用户标识
            'uid'         => 1,

            // 备注
            // 'remark'=>''
        ];

        // 签名
        $sign = $this->signature($data, $this->merchant_key);

        $data['sign'] = $sign;

        $result = $this->request($url, $data, 'POST');
        var_dump($result);
    }


    /**
     * 查单
     * @return void
     * @throws Exception
     */
    public function query()
    {
        $url = 'https://hixrs.ibpee.com:13758/api/collecting/pay';

        $data = [
            // 商户号，在商户后台查看
            'merchant_on' => $this->merchant_on,
            // 商户订单号
            'order_sn'    => 'TS202506271349282383951909',
        ];

        $sign = $this->signature($data, $this->merchant_key);

        $data['sign'] = $sign;

        $result = $this->request($url, $data, 'GET');
        var_dump($result);
    }

    /**
     * 回调通知
     * @return string
     */
    public function notify(): string
    {
        // 回调数据
        $data = $_POST ?? [];

        // 回调返回的签名字符
        $signString = $data['sign'] ?? '';

        // 验证签名
        $result = $this->verifySignature($data, $signString, $this->merchant_key);
        if ($result) {
            // 验证成功，处理您的业务逻辑

            // ......

            // 处理成功返回字符 “success”
            return 'success';
        }
        return 'fail';
    }

    /**
     * 发起请求
     *
     * @param string $url
     * @param array  $data
     * @param string $method
     * @param array  $headers
     * @param int    $timeout
     *
     * @return mixed
     * @throws Exception
     */
    protected function request(string $url, array $data = [], string $method = 'POST', array $headers = [], int $timeout = 10): mixed
    {
        // 初始化 cURL 会话
        $ch = curl_init();

        // 设置请求的 URL
        curl_setopt($ch, CURLOPT_URL, $url);

        // 设置请求头
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        // 设置超时时间
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

        // 指示不应验证 TLS 证书
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        // 设置返回响应而不是直接输出
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        // 设置请求方法
        switch (strtoupper($method)) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if (!empty($data)) {
                    $data = json_encode($data); // 将数据编码为 JSON 格式
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                    $headers[] = 'Content-Type: application/json'; // 设置 JSON 内容类型
                    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
                }
                break;
            case 'GET':
                if (!empty($data)) {
                    $query_string = http_build_query($data); // 将数据编码为查询字符串
                    $url          .= '?' . $query_string;    // 将查询字符串附加到 URL 上
                    curl_setopt($ch, CURLOPT_URL, $url);
                }
                break;
            case 'PUT':
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                if (!empty($data)) {
                    $data = json_encode($data); // 将数据编码为 JSON 格式
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
                    $headers[] = 'Content-Type: application/json'; // 设置 JSON 内容类型
                    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
                }
                break;
            default:
                throw new Exception("Unsupported HTTP method: $method");
        }

        // 执行 cURL 会话
        $response = curl_exec($ch);

        // 检查是否有错误发生
        if (curl_errno($ch)) {
            $error_msg = curl_error($ch);
            // 记录更多上下文信息
            $context = [
                'url'     => $url,
                'method'  => $method,
                'data'    => $data,
                'headers' => $headers,
                'error'   => $error_msg,
            ];
            // 处理错误
            throw new Exception(json_encode($context));
        }

        // 获取 HTTP 状态码
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        // 关闭 cURL 会话
        curl_close($ch);

        // 返回响应内容和状态码
        return json_decode($response, true);
    }

    /**
     * 生成签名
     *
     * @param array  $data      签名数据
     * @param string $appSecret 签名密钥
     *
     * @return string
     */
    protected function signature(array $data, string $appSecret): string
    {
        foreach ($data as $field => $value) {
            if ($value === '' or $value === null or $field === 'sign') {
                unset($data[$field]);
            }
        }

        ksort($data);

        $signString = '';
        foreach ($data as $field => $value) {
            $signString .= $field . '=' . $value . '&';
        }
        $signString .= 'key=' . $appSecret;
        return strtoupper(md5($signString));
    }


    /**
     * 校验签名
     *
     * @param array  $data       签名数据
     * @param string $signString 签名字符串
     * @param string $key        签名密钥
     *
     * @return bool 是否通过
     */
    protected function verifySignature(array $data, string $signString, string $key): bool
    {
        return $this->signature($data, $key) === $signString;
    }


    /**
     * 获取一个交易编号
     *
     * @param string $fix
     *
     * @return string
     */
    protected function makeOrderSn(string $fix = 'TS'): string
    {
        $order_id_main = $fix . date('YmdHis') . rand(1000, 5000) . rand(5000, 9999);
        $order_id_len  = strlen($order_id_main);
        $order_id_sum  = 0;
        for ($i = 0; $i < $order_id_len; $i++) {
            $order_id_sum += (int)(substr($order_id_main, $i, 1));
        }
        return $order_id_main . str_pad((100 - $order_id_sum % 100) % 100, 2, '0', STR_PAD_LEFT);
    }
}


$pay = new SuperPay();
// 支付
$pay->pay();

// 查单
// $pay->query();
