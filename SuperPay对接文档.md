# SuperPay

> 请先在Api设置里设置 “Api白名单” 也就是请求Api的白名单IP

### Base URLs: https://hixrs.ibpee.com:13758

> 全局请求Header

| 名称          | 位置     | 类型     | 必选 | 说明          |
|-------------|--------|--------|----|-------------|
| merchant_on | header | string | 否  | 商户号：也可随参数传递 |

## 数据签名

> 商户号和商户密钥到商户后台查看、签名密钥就是商户密钥

> 签名生成的通用步骤如下

```text
第一步：将非空参数值的参数按照参数名ASCII码从小到大排序（字典序），使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串stringA。

特别注意以下重要规则:
◆ 如果参数的值为空或null不参与签名
◆ 参数名ASCII码从小到大排序（字典序）
◆ 验证调用返回或支付中心主动通知签名时，传送的sign参数不参与签名，将生成的签名与该sign值作校验

第二步：在stringA最后拼接上key得到stringSignTemp字符串，并对stringSignTemp进行MD5运算，再将得到的字符串所有字符转换为大写，得到sign值signValue。
```

```php
    /**
     * 生成签名
     *
     * @param array  $data      签名数据
     * @param string $appSecret 签名密钥
     *
     * @return string
     */
    public function signature(array $data, string $key): string
    {
        foreach ($data as $field => $value) {
            if ($value === '' or $value === null or $field === 'sign' or $field === 'SIGN') {
                unset($data[$field]);
            }
        }
        ksort($data); //键名从低到高进行排序
        $post_url = '';
        foreach ($data as $field => $value) {
            $post_url .= $field . '=' . $value . '&';
        }
        $stringSignTemp = $post_url . 'key=' . $key;
        $sign           = md5($stringSignTemp);
        return strtoupper($sign);
    }

    /**
     * 验证签名
     *
     * @param array  $data       签名数据
     * @param string $signString 签名字符
     * @param string $appSecret  签名密钥
     *
     * @return bool
     */
    public function verifySign(array $data, string $signString, string $appSecret): bool
    {
        $sysSignString = $this->sign($data, $appSecret);
        return $sysSignString === $signString;
    }
```

## 代收提交订单

> POST /api/collecting/pay
>
> 请求参数 **Content-Type: application/json**

| 名称                | 位置     | 类型     | 必选 | 说明                    |
|-------------------|--------|--------|----|-----------------------|
| merchant_on       | header | string | 否  | 商户号：可从header传，也可随参数传递 |
| amount            | body   | string | 是  | 订单金额(元)               |
| order_sn          | body   | string | 是  | 商户单号，唯一               |
| notify_url        | body   | string | 否  | 异步通知地址(也可在商户后台配置)     |
| return_url        | body   | string | 否  | 同步跳转地址(也可在商户后台配置)     |
| extend            | body   | string | 否  | 商户扩展参数，回调通知时原样返回      |
| channel_code      | body   | string | 是  | 渠道编码                  |
| channel_type_code | body   | string | 否  | 渠道类型编码                |
| uid               | body   | string | 是  | 用户标识                  |
| remark            | body   | string | 否  | 备注                    |
| sign              | body   | string | 是  | 签名字符                  |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "Successful",
    "items": {
        "amount": "200",
        "address": "TKFAJP5BesJfP19aSCCN1om5FA2ZFEuvmx",
        "created_at": "2025-06-23T04:34:46.000000Z",
        "end_time": "2025-06-23 05:04:46",
        "jump_url": "https://test.pay.dev/pay/A202506230434462592339917",
        "uid": "1",
        "order_sn": "35067122440586476821078689231239"
    }
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

状态码 **200**

| 名称              | 类型      | 必选   | 约束   | 中文名     | 说明      |
|-----------------|---------|------|------|---------|---------|
| » success       | boolean | true | none | 请求状态    | true 成功 |
| » code          | integer | true | none | 状态码     | 0 成功    |
| » error_message | string  | true | none |         | none    |
| » items         | object  | true | none |         | none    |
| »» amount       | integer | true | none | 订单金额(元) | none    |
| »» jump_url     | string  | true | none | 支付地址    | none    |
| »» uid          | string  | true | none | 用户标识    | none    |
| »» order_sn     | string  | true | none | 订单编号    | none    |

## 代收查单

> GET /api/collecting/pay
>
> 请求参数 **Content-Type: application/json**

| 名称          | 位置     | 类型     | 必选 | 说明                    |
|-------------|--------|--------|----|-----------------------|
| order_sn    | query  | string | 是  | 商户订单号                 |
| sign        | query  | string | 是  | 签名字符                  |
| merchant_on | header | string | 否  | 商户号：可从header传，也可随参数传递 |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "string",
    "items": {
        "uid": "string",
        "order_sn": "string",
        "state": 0,
        "amount": "string",
        "rate": "string",
        "payment_amount": 0,
        "payment_date": null,
        "created_at": "string"
    }
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

状态码 **200**

| 名称                | 类型           | 必选   | 约束   | 中文名     | 说明                          |
|-------------------|--------------|------|------|---------|-----------------------------|
| » success         | boolean      | true | none | 请求状态    | none                        |
| » code            | integer      | true | none | 状态码     | none                        |
| » error_message   | string       | true | none | 提示信息    | none                        |
| » items           | object       | true | none |         | none                        |
| »» uid            | string       | true | none | 用户标识    | none                        |
| »» order_sn       | string       | true | none | 订单号     | none                        |
| »» state          | integer      | true | none | 支付状态    | 0-待支付,1-已失败,2-已超时,3-已支付     |
| »» amount         | string       | true | none | 订单金额(元) | none                        |
| »» rate           | string       | true | none | 费率(%)   | none                        |
| »» payment_amount | number       | true | none | 实际金额(元) | 实际支付金额：支付状态等于3时才有值，其它状态该值为0 |
| »» payment_date   | string\|null | true | none | 支付时间    | 支付状态等于3时才有值，其它状态该值为null     |
| »» created_at     | string       | true | none | 创建时间    | none                        |

## 代收回调

> POST 您配置或传递的回调地址
>
> 请求参数 **Content-Type: application/json**

| 名称             | 位置   | 类型           | 必选 | 中文名     | 说明                          |
|----------------|------|--------------|----|---------|-----------------------------|
| uid            | body | string       | 是  | 用户标识    | none                        |
| order_sn       | body | string       | 是  | 商户单号    | 商户订单编号，唯一                   |
| state          | body | integer      | 是  | 订单状态    | none                        |
| amount         | body | number       | 是  | 订单金额(元) | none                        |
| payment_amount | body | number       | 是  | 实际金额(元) | 实际支付金额：支付状态等于3时才有值，其它状态该值为0 |
| rate           | body | number       | 是  | 费率(%)   | none                        |
| created_at     | body | string       | 是  | 下单时间    | none                        |
| payment_date   | body | string\|null | 是  | 支付时间    | 订单状态等于3时才有值，其它状态该值为null     |
| sign           | body | string       | 是  | 签名数据    | none                        |

> 返回示例

> 200 Response

```json
{
    "uid": "1",
    "order_sn": "TS202506251441191177708918",
    "state": 3,
    "amount": "10.0000",
    "rate": "16.0000",
    "payment_amount": "10.0000",
    "payment_date": "2025-06-25 06:59:51",
    "created_at": "2025-06-25 06:59:51",
    "sign": "DDF2BF24852ECF4C59DC8ADA06290A21"
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

> 您的业务处理成功后 返回字段串 “success” 否则会间隔30秒，连续通知3次后停止通知

## 商户查询余额

> GET /api/balance
>
> 请求参数 **Content-Type: application/json**

| 名称          | 位置     | 类型     | 必选 | 说明                    |
|-------------|--------|--------|----|-----------------------|
| merchant_on | header | string | 否  | 商户号：可从header传，也可随参数传递 |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "string",
    "items": {
        "balance": 801.9981,
        "receipt": 801.9981
    }
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

状态码 **200**

| 名称              | 类型      | 必选   | 约束   | 中文名  | 说明            |
|-----------------|---------|------|------|------|---------------|
| » success       | boolean | true | none |      | true 成功、其它为失败 |
| » code          | integer | true | none |      | 0 成功、其它为失败    |
| » error_message | string  | true | none |      | none          |
| » items         | object  | true | none |      | none          |
| »» balance      | number  | true | none | 代收余额 | 单位:元          |
| »» receipt      | number  | true | none | 代付余额 | 单位:元          |

## 代收渠道编码

GET /api/collecting/channelCode

### 请求参数

| 名称          | 位置     | 类型     | 必选 | 中文名 | 说明                    |
|-------------|--------|--------|----|-----|-----------------------|
| merchant-on | header | string | 否  |     | 商户号：可从header传，也可随参数传递 |
| type_id     | query  | string | 否  |     | 渠道类型ID                |
| sign        | query  | string | 否  |     | 签名字符，不传参数时不签名         |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "Successful",
    "items": [
        {
            "code": "DF6667",
            "name": "东方支付-6667",
            "min_amount": "200.0000",
            "max_amount": "2000.0000",
            "point_amount": null,
            "remark": null
        },
        {
            "code": "HL001",
            "name": "狐狸TS001",
            "min_amount": null,
            "max_amount": null,
            "point_amount": null,
            "remark": null
        }
    ]
}
```

### 返回结果

| 状态码 | 状态码含义                                                   | 说明   | 数据模型   |
|-----|---------------------------------------------------------|------|--------|
| 200 | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1) | none | Inline |

### 返回数据结构

状态码 **200**

| 名称              | 类型          | 必选   | 约束   | 中文名  | 说明            |
|-----------------|-------------|------|------|------|---------------|
| » success       | boolean     | true | none |      | true 成功、其它为失败 |
| » code          | integer     | true | none |      | 0 成功、其它为失败    |
| » error_message | string      | true | none |      | none          |
| » items         | [object]    | true | none |      | none          |
| »» code         | string      | true | none | 编码   | none          |
| »» name         | string      | true | none | 名称   | none          |
| »» min_amount   | string¦null | true | none | 最小限额 | none          |
| »» max_amount   | string¦null | true | none | 最大限额 | none          |
| »» point_amount | null        | true | none | 固定金额 | none          |
| »» remark       | null        | true | none | 说明   | none          |

## 代收渠道类型编码

GET /api/collecting/channelTypeCode

### 请求参数

| 名称          | 位置     | 类型     | 必选 | 中文名 | 说明                    |
|-------------|--------|--------|----|-----|-----------------------|
| merchant-on | header | string | 否  |     | 商户号：可从header传，也可随参数传递 |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "Successful",
    "items": [
        {
            "id": 5,
            "parent_id": 0,
            "name": "数字货币",
            "code": "upay",
            "children": [
                {
                    "id": 9,
                    "parent_id": 5,
                    "name": "usdt固定",
                    "code": "usdt-gd"
                },
                {
                    "id": 6,
                    "parent_id": 5,
                    "name": "USDT",
                    "code": "usdt"
                }
            ]
        }
    ]
}
```

### 返回结果

| 状态码 | 状态码含义                                                   | 说明   | 数据模型   |
|-----|---------------------------------------------------------|------|--------|
| 200 | [OK](https://tools.ietf.org/html/rfc7231#section-6.3.1) | none | Inline |

### 返回数据结构

状态码 **200**

| 名称              | 类型       | 必选   | 约束   | 中文名 | 说明            |
|-----------------|----------|------|------|-----|---------------|
| » success       | boolean  | true | none |     | true 成功、其它为失败 |
| » code          | integer  | true | none |     | 0 成功、其它为失败    |
| » error_message | string   | true | none |     | none          |
| » items         | [object] | true | none |     | none          |
| »» id           | integer  | true | none |     | none          |
| »» parent_id    | integer  | true | none |     | none          |
| »» name         | string   | true | none | 名称  | none          |
| »» code         | string   | true | none | 编码  | none          |
| »» children     | [object] | true | none |     | none          |
| »»» id          | integer  | true | none |     | none          |
| »»» parent_id   | integer  | true | none |     | none          |
| »»» name        | string   | true | none |     | none          |
| »»» code        | string   | true | none |     | none          |

---

## 代付提交订单

> POST /api/receipt/create
>
> 请求参数 **Content-Type: application/json**

| 名称           | 位置     | 类型     | 必选 | 说明                                          |
|--------------|--------|--------|----|---------------------------------------------|
| merchant_on  | header | string | 否  | 商户号：可从header传，也可随参数传递                       |
| amount       | body   | float  | 是  | 代付金额：元                                      |
| order_sn     | body   | string | 是  | 商户订单号                                       |
| channel_code | body   | string | 是  | 渠道编码(商户后台查看)                                |
| bank_code    | body   | string | 否  | 银行编码(根据Api提示是否必须)                           |
| bank_name    | body   | string | 否  | 银行名称(若为支付宝/微信, 请直接填写支付宝或者微信即可)(根据Api提示是否必须) |
| bank_card    | body   | string | 是  | (通道编码非扫码收款时必须)银行卡号(若为支付宝/微信, 请填写支付宝/微信账号)   |
| bank_owner   | body   | string | 是  | (通道编码非扫码收款时必须)持卡人(若为支付宝/微信, 请填写账号实名姓名)      |
| bank_addr    | body   | string | 否  | 银行支行(若为支付宝/微信, 请填写支付宝或者微信即可)(根据Api提示是否必须)   |
| client_ip    | body   | string | 是  | 客户端下单IP                                     |
| notify_url   | body   | string | 否  | 异步通知地址(不需要通知可不填)                            |
| extend       | body   | string | 否  | 商户扩展参数，回调通知时原样返回                            |
| remark       | body   | string | 否  | 备注                                          |
| scan_payment | body   | string | 否  | 收款码图片地址(通道编码为扫码收款时必须)                       |
| sign         | body   | string | 是  | 签名字符                                        |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "Successful",
    "items": {
        "amount": "200",
        "order_sn": "35067122440586476821078689231239"
    }
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

状态码 **200**

| 名称              | 类型      | 必选   | 约束   | 中文名     | 说明            |
|-----------------|---------|------|------|---------|---------------|
| » success       | boolean | true | none | 请求状态    | true 成功、其它为失败 |
| » code          | integer | true | none | 状态码     | 0 成功、其它为失败    |
| » error_message | string  | true | none |         | none          |
| » items         | object  | true | none |         | none          |
| »» amount       | float   | true | none | 订单金额(元) | none          |
| »» order_sn     | string  | true | none | 订单编号    | none          |

## 代付查单

> GET /api/receipt/query
>
> 请求参数 **Content-Type: application/json**

| 名称          | 位置     | 类型     | 必选 | 说明                    |
|-------------|--------|--------|----|-----------------------|
| merchant_on | header | string | 否  | 商户号：可从header传，也可随参数传递 |
| order_sn    | query  | string | 是  | 商户订单号                 |
| sign        | query  | string | 是  | 签名字符                  |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "string",
    "items": {
        "order_sn": "S202508221556282453523226",
        "state": 3,
        "amount": 1000,
        "rate": 8,
        "item_amount": 7,
        "payment_amount": 1000,
        "payment_date": "2025-08-26 12:25:02",
        "created_at": "2025-08-22 15:58:50"
    }
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

状态码 **200**

| 名称                | 类型           | 必选   | 约束   | 中文名     | 说明                          |
|-------------------|--------------|------|------|---------|-----------------------------|
| » success         | boolean      | true | none | 请求状态    | true 成功、其它为失败               |
| » code            | integer      | true | none | 状态码     | 0 成功、其它为失败                  |
| » error_message   | string       | true | none | 提示信息    | none                        |
| » items           | object       | true | none |         | none                        |
| »» order_sn       | string       | true | none | 商户单号    | 商户订单编号，唯一                   |
| »» state          | integer      | true | none | 订单状态    | 0-待支付,1-已失败,2-已超时,3-已支付     |
| »» amount         | number       | true | none | 订单金额(元) | none                        |
| »» rate           | number       | true | none | 代付费率(%) | 百分比                         |
| »» item_amount    | number       | true | none | 单笔费率(元) | none                        |
| »» payment_amount | number       | true | none | 实际金额(元) | 实际代付金额、订单状态等于3时才有值，其它状态该值为0 |
| »» payment_date   | string\|null | true | none | 代付时间    | 订单状态等于3时才有值，其它状态该值为null     |
| »» created_at     | string       | true | none | 创建时间    | none                        |

## 获取银行编码

> GET /api/receipt/bank
>
> 请求参数 **Content-Type: application/json**

| 名称          | 位置     | 类型     | 必选 | 说明                    |
|-------------|--------|--------|----|-----------------------|
| merchant_on | header | string | 否  | 商户号：可从header传，也可随参数传递 |
| sign        | query  | string | 是  | 签名字符 ：参考签名方式          |

> 返回示例

> 200 Response

```json
{
    "success": true,
    "code": 0,
    "error_message": "string",
    "items": [
        {
            "label": "农业银行",
            "value": "ABC"
        },
        {
            "label": "农业发展银行",
            "value": "ADBC"
        },
        {
            "label": "安徽怀远农商行",
            "value": "AHHYRCB"
        }
    ]
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

状态码 **200**

| 名称              | 类型      | 必选   | 约束   | 中文名  | 说明   |
|-----------------|---------|------|------|------|------|
| » success       | boolean | true | none | 请求状态 | none |
| » code          | integer | true | none | 状态码  | none |
| » error_message | string  | true | none | 提示信息 | none |
| » items         | object  | true | none |      | none |
| »» label        | string  | true | none | 银行名称 | none |
| »» value        | string  | true | none | 银行编码 | none |

## 代付回调

> POST 您配置或传递的回调地址
>
> 请求参数 **Content-Type: application/json**

| 名称             | 位置   | 类型           | 必选 | 中文名     | 说明                          |
|----------------|------|--------------|----|---------|-----------------------------|
| order_sn       | body | string       | 是  | 商户单号    | 商户订单编号，唯一                   |
| state          | body | integer      | 是  | 订单状态    | 0-待支付,1-已失败,2-已超时,3-已支付     |
| amount         | body | number       | 是  | 订单金额(元) |                             |
| payment_amount | body | number       | 是  | 实际金额(元) | 实际代付金额、订单状态等于3时才有值，其它状态该值为0 |
| rate           | body | number       | 是  | 代付费率(%) |                             |
| item_amount    | body | number       | 是  | 单笔费率(元) |                             |
| created_at     | body | string       | 是  | 下单时间    | 2025-01-01 11:11:11         |
| payment_date   | body | string\|null | 是  | 代付时间    | 订单状态等于3时才有值，其它状态该值为null     |
| sign           | body | string       | 是  | 签名数据    | 参考签名方式                      |

> 返回示例

> 200 Response

```json
{
    "order_sn": "S202508221556282453523226",
    "state": 3,
    "amount": 1000,
    "rate": 8,
    "item_amount": 7,
    "payment_amount": 1000,
    "payment_date": "2025-08-26 12:25:02",
    "created_at": "2025-08-22 15:58:50",
    "sign": "DDF2BF24852ECF4C59DC8ADA06290A21"
}
```

### 返回结果

| 状态码 | 状态码含义 | 说明   | 数据模型   |
|-----|-------|------|--------|
| 200 | OK    | none | Inline |

### 返回数据结构

> 您的业务处理成功后 返回字段串 “success” 否则会间隔30秒，连续通知3次后停止通知
