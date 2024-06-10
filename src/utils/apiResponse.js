class apiResponse {
    constructor(statusCode, data, message = "Success"){
        this.message = message;
        this.data = data;
        this.statusCode = statusCode;
        this.success = statusCode < 400;
    }
}

export {apiResponse};