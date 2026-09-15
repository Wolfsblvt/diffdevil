"use strict";
exports.values = validate52;
const schema19 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:diffdevil:values:1","title":"detail typed values","description":"Typed query values; relational and safe integer checks apply in the normalized reader.","$defs":{"reason":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"measurement":{"oneOf":[{"type":"object","properties":{"status":{"const":"exact"},"value":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","value"],"allOf":[{"not":{"required":["lower"]}},{"not":{"required":["upper"]}},{"not":{"required":["reasons"]}}]},{"type":"object","properties":{"status":{"const":"bounded"},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","lower","upper"],"allOf":[{"not":{"required":["value"]}}]},{"type":"object","properties":{"status":{"const":"unknown"},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","reasons"],"allOf":[{"not":{"required":["value"]}}]},{"type":"object","properties":{"status":{"const":"unmeasurable"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","reasons"],"allOf":[{"not":{"required":["value"]}},{"not":{"required":["lower"]}},{"not":{"required":["upper"]}}]}],"description":"Semantic validation additionally normalizes singleton bounds and rejects inconsistent/inapplicable constraints."},"decision":{"oneOf":[{"type":"object","properties":{"status":{"const":"resolved"},"value":{"type":"boolean"}},"additionalProperties":true,"required":["status","value"]},{"type":"object","properties":{"status":{"const":"unknown"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","reasons"],"not":{"required":["value"]}}]},"type":{"oneOf":[{"enum":["integer","float","boolean","string","null","never"]},{"type":"object","properties":{"kind":{"const":"optional"},"item":{"$ref":"#/$defs/type"}},"additionalProperties":false,"required":["kind","item"]},{"type":"object","properties":{"kind":{"const":"collection"},"item":{"$ref":"#/$defs/type"}},"additionalProperties":false,"required":["kind","item"]},{"type":"object","properties":{"kind":{"const":"record"},"fields":{"type":"object","additionalProperties":{"$ref":"#/$defs/type"},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}}},"additionalProperties":false,"required":["kind","fields"]}]},"value":{"oneOf":[{"type":"object","properties":{"kind":{"const":"number"},"numericType":{"enum":["integer","float"]},"measurement":{"$ref":"#/$defs/measurement"}},"additionalProperties":false,"required":["kind","numericType","measurement"]},{"type":"object","properties":{"kind":{"const":"boolean"},"decision":{"$ref":"#/$defs/decision"}},"additionalProperties":false,"required":["kind","decision"]},{"type":"object","properties":{"kind":{"const":"string"},"value":{"type":"string"}},"additionalProperties":false,"required":["kind","value"]},{"type":"object","properties":{"kind":{"const":"null"}},"additionalProperties":false,"required":["kind"]},{"type":"object","properties":{"kind":{"const":"missing"}},"additionalProperties":false,"required":["kind"]},{"type":"object","properties":{"kind":{"const":"unknown"},"type":{"$ref":"#/$defs/type"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":false,"required":["kind","type","reasons"]},{"type":"object","properties":{"kind":{"const":"record"},"fields":{"type":"object","additionalProperties":{"$ref":"#/$defs/value"},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}}},"additionalProperties":false,"required":["kind","fields"]},{"type":"object","properties":{"kind":{"const":"collection"},"items":{"type":"array","items":{"type":"object","properties":{"membership":{"enum":["definite","possible"]},"value":{"$ref":"#/$defs/value"}},"additionalProperties":false,"required":["membership","value"]}},"unseen":{"type":"object","properties":{"possible":{"type":"boolean"},"minimum":{"type":"integer","minimum":0,"maximum":9007199254740991},"maximum":{"type":"integer","minimum":0,"maximum":9007199254740991}},"additionalProperties":false,"required":["possible","minimum"]},"order":{"enum":["known","unknown"]},"notes":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]}},"cardinality":{"$ref":"#/$defs/measurement","description":"Optional justified total cardinality, intersected with entry/remainder bounds. Nonnegative integer evidence only; never unmeasurable."}},"additionalProperties":false,"required":["kind","items","unseen","order"]}]}},"$ref":"#/$defs/value"};
const schema20 = {"oneOf":[{"type":"object","properties":{"kind":{"const":"number"},"numericType":{"enum":["integer","float"]},"measurement":{"$ref":"#/$defs/measurement"}},"additionalProperties":false,"required":["kind","numericType","measurement"]},{"type":"object","properties":{"kind":{"const":"boolean"},"decision":{"$ref":"#/$defs/decision"}},"additionalProperties":false,"required":["kind","decision"]},{"type":"object","properties":{"kind":{"const":"string"},"value":{"type":"string"}},"additionalProperties":false,"required":["kind","value"]},{"type":"object","properties":{"kind":{"const":"null"}},"additionalProperties":false,"required":["kind"]},{"type":"object","properties":{"kind":{"const":"missing"}},"additionalProperties":false,"required":["kind"]},{"type":"object","properties":{"kind":{"const":"unknown"},"type":{"$ref":"#/$defs/type"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":false,"required":["kind","type","reasons"]},{"type":"object","properties":{"kind":{"const":"record"},"fields":{"type":"object","additionalProperties":{"$ref":"#/$defs/value"},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}}},"additionalProperties":false,"required":["kind","fields"]},{"type":"object","properties":{"kind":{"const":"collection"},"items":{"type":"array","items":{"type":"object","properties":{"membership":{"enum":["definite","possible"]},"value":{"$ref":"#/$defs/value"}},"additionalProperties":false,"required":["membership","value"]}},"unseen":{"type":"object","properties":{"possible":{"type":"boolean"},"minimum":{"type":"integer","minimum":0,"maximum":9007199254740991},"maximum":{"type":"integer","minimum":0,"maximum":9007199254740991}},"additionalProperties":false,"required":["possible","minimum"]},"order":{"enum":["known","unknown"]},"notes":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]}},"cardinality":{"$ref":"#/$defs/measurement","description":"Optional justified total cardinality, intersected with entry/remainder bounds. Nonnegative integer evidence only; never unmeasurable."}},"additionalProperties":false,"required":["kind","items","unseen","order"]}]};
const schema21 = {"oneOf":[{"type":"object","properties":{"status":{"const":"exact"},"value":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","value"],"allOf":[{"not":{"required":["lower"]}},{"not":{"required":["upper"]}},{"not":{"required":["reasons"]}}]},{"type":"object","properties":{"status":{"const":"bounded"},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","lower","upper"],"allOf":[{"not":{"required":["value"]}}]},{"type":"object","properties":{"status":{"const":"unknown"},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","reasons"],"allOf":[{"not":{"required":["value"]}}]},{"type":"object","properties":{"status":{"const":"unmeasurable"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","reasons"],"allOf":[{"not":{"required":["value"]}},{"not":{"required":["lower"]}},{"not":{"required":["upper"]}}]}],"description":"Semantic validation additionally normalizes singleton bounds and rejects inconsistent/inapplicable constraints."};
const func1 = require("ajv/dist/runtime/ucs2length").default;

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate54.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs4 = errors;
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.lower === undefined) && (missing0 = "lower")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
var valid2 = _errs5 === errors;
if(valid2){
const err1 = {instancePath,schemaPath:"#/oneOf/0/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
errors = _errs4;
if(vErrors !== null){
if(_errs4){
vErrors.length = _errs4;
}
else {
vErrors = null;
}
}
}
const _errs7 = errors;
const _errs8 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.upper === undefined) && (missing1 = "upper")){
const err2 = {};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var valid3 = _errs8 === errors;
if(valid3){
const err3 = {instancePath,schemaPath:"#/oneOf/0/allOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
errors = _errs7;
if(vErrors !== null){
if(_errs7){
vErrors.length = _errs7;
}
else {
vErrors = null;
}
}
}
const _errs10 = errors;
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.reasons === undefined) && (missing2 = "reasons")){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
var valid4 = _errs11 === errors;
if(valid4){
const err5 = {instancePath,schemaPath:"#/oneOf/0/allOf/2/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
else {
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err6 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.value === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.status !== undefined){
if("exact" !== data.status){
const err8 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "exact"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.value !== undefined){
let data1 = data.value;
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 1.7976931348623157e+308 || isNaN(data1)){
const err9 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data1 < -1.7976931348623157e+308 || isNaN(data1)){
const err10 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
}
else {
const err12 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs16 = errors;
const _errs19 = errors;
const _errs20 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.value === undefined) && (missing3 = "value")){
const err13 = {};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
var valid7 = _errs20 === errors;
if(valid7){
const err14 = {instancePath,schemaPath:"#/oneOf/1/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
else {
errors = _errs19;
if(vErrors !== null){
if(_errs19){
vErrors.length = _errs19;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err15 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data.lower === undefined){
const err16 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "lower"},message:"must have required property '"+"lower"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data.upper === undefined){
const err17 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "upper"},message:"must have required property '"+"upper"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data.status !== undefined){
if("bounded" !== data.status){
const err18 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "bounded"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.lower !== undefined){
let data3 = data.lower;
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 1.7976931348623157e+308 || isNaN(data3)){
const err19 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/1/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data3 < -1.7976931348623157e+308 || isNaN(data3)){
const err20 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/1/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
else {
const err21 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/1/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.upper !== undefined){
let data4 = data.upper;
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 1.7976931348623157e+308 || isNaN(data4)){
const err22 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/1/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data4 < -1.7976931348623157e+308 || isNaN(data4)){
const err23 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/1/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
else {
const err24 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/1/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid0 = _errs16 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs27 = errors;
const _errs30 = errors;
const _errs31 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if((data.value === undefined) && (missing4 = "value")){
const err26 = {};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
var valid10 = _errs31 === errors;
if(valid10){
const err27 = {instancePath,schemaPath:"#/oneOf/2/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
else {
errors = _errs30;
if(vErrors !== null){
if(_errs30){
vErrors.length = _errs30;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err28 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data.reasons === undefined){
const err29 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data.status !== undefined){
if("unknown" !== data.status){
const err30 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/2/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.lower !== undefined){
let data6 = data.lower;
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 1.7976931348623157e+308 || isNaN(data6)){
const err31 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/2/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data6 < -1.7976931348623157e+308 || isNaN(data6)){
const err32 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/2/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
else {
const err33 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/2/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data.upper !== undefined){
let data7 = data.upper;
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 1.7976931348623157e+308 || isNaN(data7)){
const err34 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/2/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data7 < -1.7976931348623157e+308 || isNaN(data7)){
const err35 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/2/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
else {
const err36 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/2/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data.reasons !== undefined){
let data8 = data.reasons;
if(Array.isArray(data8)){
if(data8.length < 1){
const err37 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/2/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
const len0 = data8.length;
for(let i0=0; i0<len0; i0++){
let data9 = data8[i0];
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.code === undefined){
const err38 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/2/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data9.code !== undefined){
let data10 = data9.code;
if(typeof data10 === "string"){
if(func1(data10) < 1){
const err39 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/2/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
else {
const err40 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/2/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data9.subject !== undefined){
if(typeof data9.subject !== "string"){
const err41 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/2/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data9.message !== undefined){
if(typeof data9.message !== "string"){
const err42 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/2/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
else {
const err43 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/2/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/2/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
}
else {
const err45 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
var _valid0 = _errs27 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs49 = errors;
const _errs52 = errors;
const _errs53 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing5;
if((data.value === undefined) && (missing5 = "value")){
const err46 = {};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
var valid16 = _errs53 === errors;
if(valid16){
const err47 = {instancePath,schemaPath:"#/oneOf/3/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
else {
errors = _errs52;
if(vErrors !== null){
if(_errs52){
vErrors.length = _errs52;
}
else {
vErrors = null;
}
}
}
const _errs55 = errors;
const _errs56 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing6;
if((data.lower === undefined) && (missing6 = "lower")){
const err48 = {};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
var valid17 = _errs56 === errors;
if(valid17){
const err49 = {instancePath,schemaPath:"#/oneOf/3/allOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
else {
errors = _errs55;
if(vErrors !== null){
if(_errs55){
vErrors.length = _errs55;
}
else {
vErrors = null;
}
}
}
const _errs58 = errors;
const _errs59 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing7;
if((data.upper === undefined) && (missing7 = "upper")){
const err50 = {};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
var valid18 = _errs59 === errors;
if(valid18){
const err51 = {instancePath,schemaPath:"#/oneOf/3/allOf/2/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
else {
errors = _errs58;
if(vErrors !== null){
if(_errs58){
vErrors.length = _errs58;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err52 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data.reasons === undefined){
const err53 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data.status !== undefined){
if("unmeasurable" !== data.status){
const err54 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/3/properties/status/const",keyword:"const",params:{allowedValue: "unmeasurable"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data.reasons !== undefined){
let data14 = data.reasons;
if(Array.isArray(data14)){
if(data14.length < 1){
const err55 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/3/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
const len1 = data14.length;
for(let i1=0; i1<len1; i1++){
let data15 = data14[i1];
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.code === undefined){
const err56 = {instancePath:instancePath+"/reasons/" + i1,schemaPath:"#/oneOf/3/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data15.code !== undefined){
let data16 = data15.code;
if(typeof data16 === "string"){
if(func1(data16) < 1){
const err57 = {instancePath:instancePath+"/reasons/" + i1+"/code",schemaPath:"#/oneOf/3/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
else {
const err58 = {instancePath:instancePath+"/reasons/" + i1+"/code",schemaPath:"#/oneOf/3/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data15.subject !== undefined){
if(typeof data15.subject !== "string"){
const err59 = {instancePath:instancePath+"/reasons/" + i1+"/subject",schemaPath:"#/oneOf/3/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data15.message !== undefined){
if(typeof data15.message !== "string"){
const err60 = {instancePath:instancePath+"/reasons/" + i1+"/message",schemaPath:"#/oneOf/3/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/reasons/" + i1,schemaPath:"#/oneOf/3/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
}
else {
const err62 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/3/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
}
else {
const err63 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
var _valid0 = _errs49 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
}
}
}
if(!valid0){
const err64 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate54.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate54.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema22 = {"oneOf":[{"type":"object","properties":{"status":{"const":"resolved"},"value":{"type":"boolean"}},"additionalProperties":true,"required":["status","value"]},{"type":"object","properties":{"status":{"const":"unknown"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","reasons"],"not":{"required":["value"]}}]};

function validate56(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate56.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.value === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.status !== undefined){
if("resolved" !== data.status){
const err2 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "resolved"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.value !== undefined){
if(typeof data.value !== "boolean"){
const err3 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs7 = errors;
const _errs9 = errors;
const _errs10 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.value === undefined) && (missing0 = "value")){
const err5 = {};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
var valid2 = _errs10 === errors;
if(valid2){
const err6 = {instancePath,schemaPath:"#/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.reasons === undefined){
const err8 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.status !== undefined){
if("unknown" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.reasons !== undefined){
let data3 = data.reasons;
if(Array.isArray(data3)){
if(data3.length < 1){
const err10 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/1/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.code === undefined){
const err11 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/1/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data4.code !== undefined){
let data5 = data4.code;
if(typeof data5 === "string"){
if(func1(data5) < 1){
const err12 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/1/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/1/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data4.subject !== undefined){
if(typeof data4.subject !== "string"){
const err14 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/1/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data4.message !== undefined){
if(typeof data4.message !== "string"){
const err15 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/1/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/1/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/1/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err19 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate56.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate56.evaluated = {"dynamicProps":true,"dynamicItems":false};

const schema23 = {"oneOf":[{"enum":["integer","float","boolean","string","null","never"]},{"type":"object","properties":{"kind":{"const":"optional"},"item":{"$ref":"#/$defs/type"}},"additionalProperties":false,"required":["kind","item"]},{"type":"object","properties":{"kind":{"const":"collection"},"item":{"$ref":"#/$defs/type"}},"additionalProperties":false,"required":["kind","item"]},{"type":"object","properties":{"kind":{"const":"record"},"fields":{"type":"object","additionalProperties":{"$ref":"#/$defs/type"},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}}},"additionalProperties":false,"required":["kind","fields"]}]};
const wrapper0 = {validate: validate58};

function validate58(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate58.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!((((((data === "integer") || (data === "float")) || (data === "boolean")) || (data === "string")) || (data === "null")) || (data === "never"))){
const err0 = {instancePath,schemaPath:"#/oneOf/0/enum",keyword:"enum",params:{allowedValues: schema23.oneOf[0].enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs2 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.item === undefined){
const err2 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "item"},message:"must have required property '"+"item"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "kind") || (key0 === "item"))){
const err3 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.kind !== undefined){
if("optional" !== data.kind){
const err4 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "optional"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.item !== undefined){
if(!(wrapper0.validate(data.item, {instancePath:instancePath+"/item",parentData:data,parentDataProperty:"item",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err5 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
var props1 = true;
}
const _errs7 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err6 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.item === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "item"},message:"must have required property '"+"item"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
for(const key1 in data){
if(!((key1 === "kind") || (key1 === "item"))){
const err8 = {instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.kind !== undefined){
if("collection" !== data.kind){
const err9 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "collection"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.item !== undefined){
if(!(wrapper0.validate(data.item, {instancePath:instancePath+"/item",parentData:data,parentDataProperty:"item",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err10 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props1 !== true){
props1 = true;
}
}
const _errs12 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err11 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.fields === undefined){
const err12 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "fields"},message:"must have required property '"+"fields"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
for(const key2 in data){
if(!((key2 === "kind") || (key2 === "fields"))){
const err13 = {instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.kind !== undefined){
if("record" !== data.kind){
const err14 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "record"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.fields !== undefined){
let data5 = data.fields;
if(data5 && typeof data5 == "object" && !Array.isArray(data5)){
for(const key3 in data5){
const _errs18 = errors;
const _errs19 = errors;
const _errs20 = errors;
if(!(((key3 === "__proto__") || (key3 === "constructor")) || (key3 === "prototype"))){
const err15 = {};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
var valid5 = _errs20 === errors;
if(valid5){
const err16 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/3/properties/fields/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key3};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
else {
errors = _errs19;
if(vErrors !== null){
if(_errs19){
vErrors.length = _errs19;
}
else {
vErrors = null;
}
}
}
if(typeof key3 === "string"){
if(func1(key3) < 1){
const err17 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/3/properties/fields/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key3};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
var valid4 = _errs18 === errors;
if(!valid4){
const err18 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/3/properties/fields/propertyNames",keyword:"propertyNames",params:{propertyName: key3},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
for(const key4 in data5){
if(!(wrapper0.validate(data5[key4], {instancePath:instancePath+"/fields/" + key4.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data5,parentDataProperty:key4,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err19 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/3/properties/fields/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
var _valid0 = _errs12 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props1 !== true){
props1 = true;
}
}
}
}
}
if(!valid0){
const err21 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate58.errors = vErrors;
evaluated0.props = props1;
return errors === 0;
}
validate58.evaluated = {"dynamicProps":true,"dynamicItems":false};

const wrapper3 = {validate: validate53};

function validate53(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate53.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.numericType === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "numericType"},message:"must have required property '"+"numericType"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.measurement === undefined){
const err2 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "measurement"},message:"must have required property '"+"measurement"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "kind") || (key0 === "numericType")) || (key0 === "measurement"))){
const err3 = {instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.kind !== undefined){
if("number" !== data.kind){
const err4 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "number"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.numericType !== undefined){
let data1 = data.numericType;
if(!((data1 === "integer") || (data1 === "float"))){
const err5 = {instancePath:instancePath+"/numericType",schemaPath:"#/oneOf/0/properties/numericType/enum",keyword:"enum",params:{allowedValues: schema20.oneOf[0].properties.numericType.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.measurement !== undefined){
if(!(validate54(data.measurement, {instancePath:instancePath+"/measurement",parentData:data,parentDataProperty:"measurement",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props1 = true;
}
const _errs7 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.decision === undefined){
const err8 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "decision"},message:"must have required property '"+"decision"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
for(const key1 in data){
if(!((key1 === "kind") || (key1 === "decision"))){
const err9 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.kind !== undefined){
if("boolean" !== data.kind){
const err10 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "boolean"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.decision !== undefined){
if(!(validate56(data.decision, {instancePath:instancePath+"/decision",parentData:data,parentDataProperty:"decision",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
}
else {
const err11 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props1 !== true){
props1 = true;
}
}
const _errs12 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err12 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.value === undefined){
const err13 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
for(const key2 in data){
if(!((key2 === "kind") || (key2 === "value"))){
const err14 = {instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.kind !== undefined){
if("string" !== data.kind){
const err15 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "string"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.value !== undefined){
if(typeof data.value !== "string"){
const err16 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/2/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var _valid0 = _errs12 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props1 !== true){
props1 = true;
}
}
const _errs18 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err18 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
for(const key3 in data){
if(!(key3 === "kind")){
const err19 = {instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.kind !== undefined){
if("null" !== data.kind){
const err20 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "null"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
}
else {
const err21 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
var _valid0 = _errs18 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props1 !== true){
props1 = true;
}
}
const _errs22 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err22 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
for(const key4 in data){
if(!(key4 === "kind")){
const err23 = {instancePath,schemaPath:"#/oneOf/4/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.kind !== undefined){
if("missing" !== data.kind){
const err24 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/4/properties/kind/const",keyword:"const",params:{allowedValue: "missing"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath,schemaPath:"#/oneOf/4/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid0 = _errs22 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props1 !== true){
props1 = true;
}
}
const _errs26 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err26 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data.type === undefined){
const err27 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data.reasons === undefined){
const err28 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
for(const key5 in data){
if(!(((key5 === "kind") || (key5 === "type")) || (key5 === "reasons"))){
const err29 = {instancePath,schemaPath:"#/oneOf/5/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data.kind !== undefined){
if("unknown" !== data.kind){
const err30 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/5/properties/kind/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.type !== undefined){
if(!(validate58(data.type, {instancePath:instancePath+"/type",parentData:data,parentDataProperty:"type",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
errors = vErrors.length;
}
}
if(data.reasons !== undefined){
let data11 = data.reasons;
if(Array.isArray(data11)){
if(data11.length < 1){
const err31 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/5/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
const len0 = data11.length;
for(let i0=0; i0<len0; i0++){
let data12 = data11[i0];
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
if(data12.code === undefined){
const err32 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/5/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data12.code !== undefined){
let data13 = data12.code;
if(typeof data13 === "string"){
if(func1(data13) < 1){
const err33 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/5/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/5/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data12.subject !== undefined){
if(typeof data12.subject !== "string"){
const err35 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/5/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data12.message !== undefined){
if(typeof data12.message !== "string"){
const err36 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/5/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
else {
const err37 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/5/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
}
else {
const err38 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/5/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
else {
const err39 = {instancePath,schemaPath:"#/oneOf/5/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
var _valid0 = _errs26 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props1 !== true){
props1 = true;
}
}
const _errs42 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err40 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data.fields === undefined){
const err41 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "fields"},message:"must have required property '"+"fields"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
for(const key6 in data){
if(!((key6 === "kind") || (key6 === "fields"))){
const err42 = {instancePath,schemaPath:"#/oneOf/6/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data.kind !== undefined){
if("record" !== data.kind){
const err43 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/6/properties/kind/const",keyword:"const",params:{allowedValue: "record"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data.fields !== undefined){
let data17 = data.fields;
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
for(const key7 in data17){
const _errs48 = errors;
const _errs49 = errors;
const _errs50 = errors;
if(!(((key7 === "__proto__") || (key7 === "constructor")) || (key7 === "prototype"))){
const err44 = {};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
var valid12 = _errs50 === errors;
if(valid12){
const err45 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key7};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
else {
errors = _errs49;
if(vErrors !== null){
if(_errs49){
vErrors.length = _errs49;
}
else {
vErrors = null;
}
}
}
if(typeof key7 === "string"){
if(func1(key7) < 1){
const err46 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key7};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
var valid11 = _errs48 === errors;
if(!valid11){
const err47 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/propertyNames",keyword:"propertyNames",params:{propertyName: key7},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
for(const key8 in data17){
if(!(wrapper3.validate(data17[key8], {instancePath:instancePath+"/fields/" + key8.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data17,parentDataProperty:key8,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper3.validate.errors : vErrors.concat(wrapper3.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err48 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
}
else {
const err49 = {instancePath,schemaPath:"#/oneOf/6/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
var _valid0 = _errs42 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props1 !== true){
props1 = true;
}
}
const _errs53 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err50 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data.items === undefined){
const err51 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "items"},message:"must have required property '"+"items"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data.unseen === undefined){
const err52 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "unseen"},message:"must have required property '"+"unseen"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data.order === undefined){
const err53 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "order"},message:"must have required property '"+"order"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
for(const key9 in data){
if(!((((((key9 === "kind") || (key9 === "items")) || (key9 === "unseen")) || (key9 === "order")) || (key9 === "notes")) || (key9 === "cardinality"))){
const err54 = {instancePath,schemaPath:"#/oneOf/7/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data.kind !== undefined){
if("collection" !== data.kind){
const err55 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/7/properties/kind/const",keyword:"const",params:{allowedValue: "collection"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data.items !== undefined){
let data20 = data.items;
if(Array.isArray(data20)){
const len1 = data20.length;
for(let i1=0; i1<len1; i1++){
let data21 = data20[i1];
if(data21 && typeof data21 == "object" && !Array.isArray(data21)){
if(data21.membership === undefined){
const err56 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/required",keyword:"required",params:{missingProperty: "membership"},message:"must have required property '"+"membership"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data21.value === undefined){
const err57 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
for(const key10 in data21){
if(!((key10 === "membership") || (key10 === "value"))){
const err58 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key10},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data21.membership !== undefined){
let data22 = data21.membership;
if(!((data22 === "definite") || (data22 === "possible"))){
const err59 = {instancePath:instancePath+"/items/" + i1+"/membership",schemaPath:"#/oneOf/7/properties/items/items/properties/membership/enum",keyword:"enum",params:{allowedValues: schema20.oneOf[7].properties.items.items.properties.membership.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data21.value !== undefined){
if(!(wrapper3.validate(data21.value, {instancePath:instancePath+"/items/" + i1+"/value",parentData:data21,parentDataProperty:"value",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper3.validate.errors : vErrors.concat(wrapper3.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err60 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/items",schemaPath:"#/oneOf/7/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data.unseen !== undefined){
let data24 = data.unseen;
if(data24 && typeof data24 == "object" && !Array.isArray(data24)){
if(data24.possible === undefined){
const err62 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/required",keyword:"required",params:{missingProperty: "possible"},message:"must have required property '"+"possible"+"'"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
if(data24.minimum === undefined){
const err63 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/required",keyword:"required",params:{missingProperty: "minimum"},message:"must have required property '"+"minimum"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
for(const key11 in data24){
if(!(((key11 === "possible") || (key11 === "minimum")) || (key11 === "maximum"))){
const err64 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key11},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
}
if(data24.possible !== undefined){
if(typeof data24.possible !== "boolean"){
const err65 = {instancePath:instancePath+"/unseen/possible",schemaPath:"#/oneOf/7/properties/unseen/properties/possible/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data24.minimum !== undefined){
let data26 = data24.minimum;
if(!(((typeof data26 == "number") && (!(data26 % 1) && !isNaN(data26))) && (isFinite(data26)))){
const err66 = {instancePath:instancePath+"/unseen/minimum",schemaPath:"#/oneOf/7/properties/unseen/properties/minimum/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
if((typeof data26 == "number") && (isFinite(data26))){
if(data26 > 9007199254740991 || isNaN(data26)){
const err67 = {instancePath:instancePath+"/unseen/minimum",schemaPath:"#/oneOf/7/properties/unseen/properties/minimum/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(data26 < 0 || isNaN(data26)){
const err68 = {instancePath:instancePath+"/unseen/minimum",schemaPath:"#/oneOf/7/properties/unseen/properties/minimum/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
}
if(data24.maximum !== undefined){
let data27 = data24.maximum;
if(!(((typeof data27 == "number") && (!(data27 % 1) && !isNaN(data27))) && (isFinite(data27)))){
const err69 = {instancePath:instancePath+"/unseen/maximum",schemaPath:"#/oneOf/7/properties/unseen/properties/maximum/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
if((typeof data27 == "number") && (isFinite(data27))){
if(data27 > 9007199254740991 || isNaN(data27)){
const err70 = {instancePath:instancePath+"/unseen/maximum",schemaPath:"#/oneOf/7/properties/unseen/properties/maximum/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
if(data27 < 0 || isNaN(data27)){
const err71 = {instancePath:instancePath+"/unseen/maximum",schemaPath:"#/oneOf/7/properties/unseen/properties/maximum/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
}
}
else {
const err72 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data.order !== undefined){
let data28 = data.order;
if(!((data28 === "known") || (data28 === "unknown"))){
const err73 = {instancePath:instancePath+"/order",schemaPath:"#/oneOf/7/properties/order/enum",keyword:"enum",params:{allowedValues: schema20.oneOf[7].properties.order.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
if(data.notes !== undefined){
let data29 = data.notes;
if(Array.isArray(data29)){
const len2 = data29.length;
for(let i2=0; i2<len2; i2++){
let data30 = data29[i2];
if(data30 && typeof data30 == "object" && !Array.isArray(data30)){
if(data30.code === undefined){
const err74 = {instancePath:instancePath+"/notes/" + i2,schemaPath:"#/oneOf/7/properties/notes/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
if(data30.code !== undefined){
let data31 = data30.code;
if(typeof data31 === "string"){
if(func1(data31) < 1){
const err75 = {instancePath:instancePath+"/notes/" + i2+"/code",schemaPath:"#/oneOf/7/properties/notes/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
else {
const err76 = {instancePath:instancePath+"/notes/" + i2+"/code",schemaPath:"#/oneOf/7/properties/notes/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
if(data30.subject !== undefined){
if(typeof data30.subject !== "string"){
const err77 = {instancePath:instancePath+"/notes/" + i2+"/subject",schemaPath:"#/oneOf/7/properties/notes/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data30.message !== undefined){
if(typeof data30.message !== "string"){
const err78 = {instancePath:instancePath+"/notes/" + i2+"/message",schemaPath:"#/oneOf/7/properties/notes/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
}
else {
const err79 = {instancePath:instancePath+"/notes/" + i2,schemaPath:"#/oneOf/7/properties/notes/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath:instancePath+"/notes",schemaPath:"#/oneOf/7/properties/notes/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
if(data.cardinality !== undefined){
if(!(validate54(data.cardinality, {instancePath:instancePath+"/cardinality",parentData:data,parentDataProperty:"cardinality",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
}
}
else {
const err81 = {instancePath,schemaPath:"#/oneOf/7/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
var _valid0 = _errs53 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props1 !== true){
props1 = true;
}
}
}
}
}
}
}
}
}
if(!valid0){
const err82 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate53.errors = vErrors;
evaluated0.props = props1;
return errors === 0;
}
validate53.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="urn:diffdevil:values:1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(!(validate53(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
else {
var props0 = validate53.evaluated.props;
}
validate52.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate52.evaluated = {"dynamicProps":true,"dynamicItems":false};

exports.ast = validate62;
const schema24 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:diffdevil:ast:1","title":"detail internal syntax tree","description":"Internal construction/conformance asset. Not a public persisted compiled-program format.","$defs":{"span":{"type":"object","properties":{"source":{"type":"string"},"start":{"type":"integer","minimum":0,"maximum":9007199254740991},"end":{"type":"integer","minimum":0,"maximum":9007199254740991}},"additionalProperties":false,"required":["start","end"]},"node":{"oneOf":[{"type":"object","properties":{"kind":{"const":"literal"},"span":{"$ref":"#/$defs/span"},"literalType":{"enum":["integer","float","string","boolean","null"]},"raw":{"type":"string"},"value":{"type":["number","string","boolean","null"]}},"additionalProperties":false,"required":["kind","span","literalType","raw","value"]},{"type":"object","properties":{"kind":{"const":"identifier"},"span":{"$ref":"#/$defs/span"},"name":{"type":"string","minLength":1}},"additionalProperties":false,"required":["kind","span","name"]},{"type":"object","properties":{"kind":{"const":"member"},"span":{"$ref":"#/$defs/span"},"object":{"$ref":"#/$defs/node"},"key":{"type":"string"},"keySpan":{"$ref":"#/$defs/span"}},"additionalProperties":false,"required":["kind","span","object","key","keySpan"]},{"type":"object","properties":{"kind":{"const":"unary"},"span":{"$ref":"#/$defs/span"},"operator":{"enum":["!","+","-"]},"operatorSpan":{"$ref":"#/$defs/span"},"operand":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","operator","operatorSpan","operand"]},{"type":"object","properties":{"kind":{"const":"binary"},"span":{"$ref":"#/$defs/span"},"operator":{"enum":["+","-","*","/","%","<","<=",">",">=","==","!=","in","&&","||"]},"operatorSpan":{"$ref":"#/$defs/span"},"left":{"$ref":"#/$defs/node"},"right":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","operator","operatorSpan","left","right"]},{"type":"object","properties":{"kind":{"const":"conditional"},"span":{"$ref":"#/$defs/span"},"condition":{"$ref":"#/$defs/node"},"whenTrue":{"$ref":"#/$defs/node"},"whenFalse":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","condition","whenTrue","whenFalse"]},{"type":"object","properties":{"kind":{"const":"call"},"span":{"$ref":"#/$defs/span"},"name":{"type":"string"},"nameSpan":{"$ref":"#/$defs/span"},"arguments":{"type":"array","items":{"$ref":"#/$defs/node"}}},"additionalProperties":false,"required":["kind","span","name","nameSpan","arguments"]},{"type":"object","properties":{"kind":{"const":"lambda"},"span":{"$ref":"#/$defs/span"},"parameter":{"type":"string"},"parameterSpan":{"$ref":"#/$defs/span"},"body":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","parameter","parameterSpan","body"]},{"type":"object","properties":{"kind":{"const":"list"},"span":{"$ref":"#/$defs/span"},"items":{"type":"array","items":{"$ref":"#/$defs/node"}}},"additionalProperties":false,"required":["kind","span","items"]},{"type":"object","properties":{"kind":{"const":"record"},"span":{"$ref":"#/$defs/span"},"fields":{"type":"array","items":{"type":"object","properties":{"key":{"type":"string"},"keySpan":{"$ref":"#/$defs/span"},"value":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["key","keySpan","value"]}}},"additionalProperties":false,"required":["kind","span","fields"]}]}},"$ref":"#/$defs/node"};
const schema25 = {"oneOf":[{"type":"object","properties":{"kind":{"const":"literal"},"span":{"$ref":"#/$defs/span"},"literalType":{"enum":["integer","float","string","boolean","null"]},"raw":{"type":"string"},"value":{"type":["number","string","boolean","null"]}},"additionalProperties":false,"required":["kind","span","literalType","raw","value"]},{"type":"object","properties":{"kind":{"const":"identifier"},"span":{"$ref":"#/$defs/span"},"name":{"type":"string","minLength":1}},"additionalProperties":false,"required":["kind","span","name"]},{"type":"object","properties":{"kind":{"const":"member"},"span":{"$ref":"#/$defs/span"},"object":{"$ref":"#/$defs/node"},"key":{"type":"string"},"keySpan":{"$ref":"#/$defs/span"}},"additionalProperties":false,"required":["kind","span","object","key","keySpan"]},{"type":"object","properties":{"kind":{"const":"unary"},"span":{"$ref":"#/$defs/span"},"operator":{"enum":["!","+","-"]},"operatorSpan":{"$ref":"#/$defs/span"},"operand":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","operator","operatorSpan","operand"]},{"type":"object","properties":{"kind":{"const":"binary"},"span":{"$ref":"#/$defs/span"},"operator":{"enum":["+","-","*","/","%","<","<=",">",">=","==","!=","in","&&","||"]},"operatorSpan":{"$ref":"#/$defs/span"},"left":{"$ref":"#/$defs/node"},"right":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","operator","operatorSpan","left","right"]},{"type":"object","properties":{"kind":{"const":"conditional"},"span":{"$ref":"#/$defs/span"},"condition":{"$ref":"#/$defs/node"},"whenTrue":{"$ref":"#/$defs/node"},"whenFalse":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","condition","whenTrue","whenFalse"]},{"type":"object","properties":{"kind":{"const":"call"},"span":{"$ref":"#/$defs/span"},"name":{"type":"string"},"nameSpan":{"$ref":"#/$defs/span"},"arguments":{"type":"array","items":{"$ref":"#/$defs/node"}}},"additionalProperties":false,"required":["kind","span","name","nameSpan","arguments"]},{"type":"object","properties":{"kind":{"const":"lambda"},"span":{"$ref":"#/$defs/span"},"parameter":{"type":"string"},"parameterSpan":{"$ref":"#/$defs/span"},"body":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["kind","span","parameter","parameterSpan","body"]},{"type":"object","properties":{"kind":{"const":"list"},"span":{"$ref":"#/$defs/span"},"items":{"type":"array","items":{"$ref":"#/$defs/node"}}},"additionalProperties":false,"required":["kind","span","items"]},{"type":"object","properties":{"kind":{"const":"record"},"span":{"$ref":"#/$defs/span"},"fields":{"type":"array","items":{"type":"object","properties":{"key":{"type":"string"},"keySpan":{"$ref":"#/$defs/span"},"value":{"$ref":"#/$defs/node"}},"additionalProperties":false,"required":["key","keySpan","value"]}}},"additionalProperties":false,"required":["kind","span","fields"]}]};
const schema26 = {"type":"object","properties":{"source":{"type":"string"},"start":{"type":"integer","minimum":0,"maximum":9007199254740991},"end":{"type":"integer","minimum":0,"maximum":9007199254740991}},"additionalProperties":false,"required":["start","end"]};

function validate64(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate64.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.start === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "start"},message:"must have required property '"+"start"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.end === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "end"},message:"must have required property '"+"end"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "source") || (key0 === "start")) || (key0 === "end"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.source !== undefined){
if(typeof data.source !== "string"){
const err3 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.start !== undefined){
let data1 = data.start;
if(!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))){
const err4 = {instancePath:instancePath+"/start",schemaPath:"#/properties/start/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/start",schemaPath:"#/properties/start/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1 < 0 || isNaN(data1)){
const err6 = {instancePath:instancePath+"/start",schemaPath:"#/properties/start/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
if(data.end !== undefined){
let data2 = data.end;
if(!(((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2))) && (isFinite(data2)))){
const err7 = {instancePath:instancePath+"/end",schemaPath:"#/properties/end/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if((typeof data2 == "number") && (isFinite(data2))){
if(data2 > 9007199254740991 || isNaN(data2)){
const err8 = {instancePath:instancePath+"/end",schemaPath:"#/properties/end/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2 < 0 || isNaN(data2)){
const err9 = {instancePath:instancePath+"/end",schemaPath:"#/properties/end/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
}
else {
const err10 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
validate64.errors = vErrors;
return errors === 0;
}
validate64.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const wrapper5 = {validate: validate63};

function validate63(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate63.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.span === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.literalType === undefined){
const err2 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "literalType"},message:"must have required property '"+"literalType"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.raw === undefined){
const err3 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "raw"},message:"must have required property '"+"raw"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.value === undefined){
const err4 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "kind") || (key0 === "span")) || (key0 === "literalType")) || (key0 === "raw")) || (key0 === "value"))){
const err5 = {instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.kind !== undefined){
if("literal" !== data.kind){
const err6 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "literal"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.literalType !== undefined){
let data2 = data.literalType;
if(!(((((data2 === "integer") || (data2 === "float")) || (data2 === "string")) || (data2 === "boolean")) || (data2 === "null"))){
const err7 = {instancePath:instancePath+"/literalType",schemaPath:"#/oneOf/0/properties/literalType/enum",keyword:"enum",params:{allowedValues: schema25.oneOf[0].properties.literalType.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.raw !== undefined){
if(typeof data.raw !== "string"){
const err8 = {instancePath:instancePath+"/raw",schemaPath:"#/oneOf/0/properties/raw/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.value !== undefined){
let data4 = data.value;
if((((!((typeof data4 == "number") && (isFinite(data4)))) && (typeof data4 !== "string")) && (typeof data4 !== "boolean")) && (data4 !== null)){
const err9 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/type",keyword:"type",params:{type: schema25.oneOf[0].properties.value.type},message:"must be number,string,boolean,null"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
}
else {
const err10 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err11 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.span === undefined){
const err12 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.name === undefined){
const err13 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
for(const key1 in data){
if(!(((key1 === "kind") || (key1 === "span")) || (key1 === "name"))){
const err14 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.kind !== undefined){
if("identifier" !== data.kind){
const err15 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "identifier"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.name !== undefined){
let data7 = data.name;
if(typeof data7 === "string"){
if(func1(data7) < 1){
const err16 = {instancePath:instancePath+"/name",schemaPath:"#/oneOf/1/properties/name/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/name",schemaPath:"#/oneOf/1/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid0 = _errs11 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs18 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err19 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data.span === undefined){
const err20 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data.object === undefined){
const err21 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "object"},message:"must have required property '"+"object"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data.key === undefined){
const err22 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "key"},message:"must have required property '"+"key"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data.keySpan === undefined){
const err23 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "keySpan"},message:"must have required property '"+"keySpan"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
for(const key2 in data){
if(!(((((key2 === "kind") || (key2 === "span")) || (key2 === "object")) || (key2 === "key")) || (key2 === "keySpan"))){
const err24 = {instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data.kind !== undefined){
if("member" !== data.kind){
const err25 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "member"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.object !== undefined){
if(!(wrapper5.validate(data.object, {instancePath:instancePath+"/object",parentData:data,parentDataProperty:"object",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
if(data.key !== undefined){
if(typeof data.key !== "string"){
const err26 = {instancePath:instancePath+"/key",schemaPath:"#/oneOf/2/properties/key/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.keySpan !== undefined){
if(!(validate64(data.keySpan, {instancePath:instancePath+"/keySpan",parentData:data,parentDataProperty:"keySpan",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
}
else {
const err27 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
var _valid0 = _errs18 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs27 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err28 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data.span === undefined){
const err29 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data.operator === undefined){
const err30 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "operator"},message:"must have required property '"+"operator"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data.operatorSpan === undefined){
const err31 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "operatorSpan"},message:"must have required property '"+"operatorSpan"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data.operand === undefined){
const err32 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "operand"},message:"must have required property '"+"operand"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
for(const key3 in data){
if(!(((((key3 === "kind") || (key3 === "span")) || (key3 === "operator")) || (key3 === "operatorSpan")) || (key3 === "operand"))){
const err33 = {instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data.kind !== undefined){
if("unary" !== data.kind){
const err34 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "unary"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.operator !== undefined){
let data15 = data.operator;
if(!(((data15 === "!") || (data15 === "+")) || (data15 === "-"))){
const err35 = {instancePath:instancePath+"/operator",schemaPath:"#/oneOf/3/properties/operator/enum",keyword:"enum",params:{allowedValues: schema25.oneOf[3].properties.operator.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data.operatorSpan !== undefined){
if(!(validate64(data.operatorSpan, {instancePath:instancePath+"/operatorSpan",parentData:data,parentDataProperty:"operatorSpan",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.operand !== undefined){
if(!(wrapper5.validate(data.operand, {instancePath:instancePath+"/operand",parentData:data,parentDataProperty:"operand",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err36 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
var _valid0 = _errs27 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs35 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err37 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data.span === undefined){
const err38 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data.operator === undefined){
const err39 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "operator"},message:"must have required property '"+"operator"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data.operatorSpan === undefined){
const err40 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "operatorSpan"},message:"must have required property '"+"operatorSpan"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data.left === undefined){
const err41 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "left"},message:"must have required property '"+"left"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data.right === undefined){
const err42 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "right"},message:"must have required property '"+"right"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
for(const key4 in data){
if(!((((((key4 === "kind") || (key4 === "span")) || (key4 === "operator")) || (key4 === "operatorSpan")) || (key4 === "left")) || (key4 === "right"))){
const err43 = {instancePath,schemaPath:"#/oneOf/4/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data.kind !== undefined){
if("binary" !== data.kind){
const err44 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/4/properties/kind/const",keyword:"const",params:{allowedValue: "binary"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.operator !== undefined){
let data20 = data.operator;
if(!((((((((((((((data20 === "+") || (data20 === "-")) || (data20 === "*")) || (data20 === "/")) || (data20 === "%")) || (data20 === "<")) || (data20 === "<=")) || (data20 === ">")) || (data20 === ">=")) || (data20 === "==")) || (data20 === "!=")) || (data20 === "in")) || (data20 === "&&")) || (data20 === "||"))){
const err45 = {instancePath:instancePath+"/operator",schemaPath:"#/oneOf/4/properties/operator/enum",keyword:"enum",params:{allowedValues: schema25.oneOf[4].properties.operator.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data.operatorSpan !== undefined){
if(!(validate64(data.operatorSpan, {instancePath:instancePath+"/operatorSpan",parentData:data,parentDataProperty:"operatorSpan",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.left !== undefined){
if(!(wrapper5.validate(data.left, {instancePath:instancePath+"/left",parentData:data,parentDataProperty:"left",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
if(data.right !== undefined){
if(!(wrapper5.validate(data.right, {instancePath:instancePath+"/right",parentData:data,parentDataProperty:"right",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err46 = {instancePath,schemaPath:"#/oneOf/4/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
var _valid0 = _errs35 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs44 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err47 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data.span === undefined){
const err48 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data.condition === undefined){
const err49 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "condition"},message:"must have required property '"+"condition"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(data.whenTrue === undefined){
const err50 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "whenTrue"},message:"must have required property '"+"whenTrue"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data.whenFalse === undefined){
const err51 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "whenFalse"},message:"must have required property '"+"whenFalse"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
for(const key5 in data){
if(!(((((key5 === "kind") || (key5 === "span")) || (key5 === "condition")) || (key5 === "whenTrue")) || (key5 === "whenFalse"))){
const err52 = {instancePath,schemaPath:"#/oneOf/5/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.kind !== undefined){
if("conditional" !== data.kind){
const err53 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/5/properties/kind/const",keyword:"const",params:{allowedValue: "conditional"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.condition !== undefined){
if(!(wrapper5.validate(data.condition, {instancePath:instancePath+"/condition",parentData:data,parentDataProperty:"condition",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
if(data.whenTrue !== undefined){
if(!(wrapper5.validate(data.whenTrue, {instancePath:instancePath+"/whenTrue",parentData:data,parentDataProperty:"whenTrue",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
if(data.whenFalse !== undefined){
if(!(wrapper5.validate(data.whenFalse, {instancePath:instancePath+"/whenFalse",parentData:data,parentDataProperty:"whenFalse",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err54 = {instancePath,schemaPath:"#/oneOf/5/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
var _valid0 = _errs44 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
const _errs52 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err55 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data.span === undefined){
const err56 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data.name === undefined){
const err57 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
if(data.nameSpan === undefined){
const err58 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "nameSpan"},message:"must have required property '"+"nameSpan"+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
if(data.arguments === undefined){
const err59 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "arguments"},message:"must have required property '"+"arguments"+"'"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
for(const key6 in data){
if(!(((((key6 === "kind") || (key6 === "span")) || (key6 === "name")) || (key6 === "nameSpan")) || (key6 === "arguments"))){
const err60 = {instancePath,schemaPath:"#/oneOf/6/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data.kind !== undefined){
if("call" !== data.kind){
const err61 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/6/properties/kind/const",keyword:"const",params:{allowedValue: "call"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.name !== undefined){
if(typeof data.name !== "string"){
const err62 = {instancePath:instancePath+"/name",schemaPath:"#/oneOf/6/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
if(data.nameSpan !== undefined){
if(!(validate64(data.nameSpan, {instancePath:instancePath+"/nameSpan",parentData:data,parentDataProperty:"nameSpan",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.arguments !== undefined){
let data33 = data.arguments;
if(Array.isArray(data33)){
const len0 = data33.length;
for(let i0=0; i0<len0; i0++){
if(!(wrapper5.validate(data33[i0], {instancePath:instancePath+"/arguments/" + i0,parentData:data33,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err63 = {instancePath:instancePath+"/arguments",schemaPath:"#/oneOf/6/properties/arguments/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
}
else {
const err64 = {instancePath,schemaPath:"#/oneOf/6/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
var _valid0 = _errs52 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = true;
}
}
const _errs63 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err65 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
if(data.span === undefined){
const err66 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
if(data.parameter === undefined){
const err67 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "parameter"},message:"must have required property '"+"parameter"+"'"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(data.parameterSpan === undefined){
const err68 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "parameterSpan"},message:"must have required property '"+"parameterSpan"+"'"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
if(data.body === undefined){
const err69 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "body"},message:"must have required property '"+"body"+"'"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
for(const key7 in data){
if(!(((((key7 === "kind") || (key7 === "span")) || (key7 === "parameter")) || (key7 === "parameterSpan")) || (key7 === "body"))){
const err70 = {instancePath,schemaPath:"#/oneOf/7/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key7},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
if(data.kind !== undefined){
if("lambda" !== data.kind){
const err71 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/7/properties/kind/const",keyword:"const",params:{allowedValue: "lambda"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.parameter !== undefined){
if(typeof data.parameter !== "string"){
const err72 = {instancePath:instancePath+"/parameter",schemaPath:"#/oneOf/7/properties/parameter/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data.parameterSpan !== undefined){
if(!(validate64(data.parameterSpan, {instancePath:instancePath+"/parameterSpan",parentData:data,parentDataProperty:"parameterSpan",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.body !== undefined){
if(!(wrapper5.validate(data.body, {instancePath:instancePath+"/body",parentData:data,parentDataProperty:"body",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err73 = {instancePath,schemaPath:"#/oneOf/7/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
var _valid0 = _errs63 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props0 !== true){
props0 = true;
}
}
const _errs72 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err74 = {instancePath,schemaPath:"#/oneOf/8/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
if(data.span === undefined){
const err75 = {instancePath,schemaPath:"#/oneOf/8/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
if(data.items === undefined){
const err76 = {instancePath,schemaPath:"#/oneOf/8/required",keyword:"required",params:{missingProperty: "items"},message:"must have required property '"+"items"+"'"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
for(const key8 in data){
if(!(((key8 === "kind") || (key8 === "span")) || (key8 === "items"))){
const err77 = {instancePath,schemaPath:"#/oneOf/8/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key8},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data.kind !== undefined){
if("list" !== data.kind){
const err78 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/8/properties/kind/const",keyword:"const",params:{allowedValue: "list"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.items !== undefined){
let data42 = data.items;
if(Array.isArray(data42)){
const len1 = data42.length;
for(let i1=0; i1<len1; i1++){
if(!(wrapper5.validate(data42[i1], {instancePath:instancePath+"/items/" + i1,parentData:data42,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err79 = {instancePath:instancePath+"/items",schemaPath:"#/oneOf/8/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath,schemaPath:"#/oneOf/8/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
var _valid0 = _errs72 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 8];
}
else {
if(_valid0){
valid0 = true;
passing0 = 8;
if(props0 !== true){
props0 = true;
}
}
const _errs80 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err81 = {instancePath,schemaPath:"#/oneOf/9/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
if(data.span === undefined){
const err82 = {instancePath,schemaPath:"#/oneOf/9/required",keyword:"required",params:{missingProperty: "span"},message:"must have required property '"+"span"+"'"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
if(data.fields === undefined){
const err83 = {instancePath,schemaPath:"#/oneOf/9/required",keyword:"required",params:{missingProperty: "fields"},message:"must have required property '"+"fields"+"'"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
for(const key9 in data){
if(!(((key9 === "kind") || (key9 === "span")) || (key9 === "fields"))){
const err84 = {instancePath,schemaPath:"#/oneOf/9/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
if(data.kind !== undefined){
if("record" !== data.kind){
const err85 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/9/properties/kind/const",keyword:"const",params:{allowedValue: "record"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
if(data.span !== undefined){
if(!(validate64(data.span, {instancePath:instancePath+"/span",parentData:data,parentDataProperty:"span",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data.fields !== undefined){
let data46 = data.fields;
if(Array.isArray(data46)){
const len2 = data46.length;
for(let i2=0; i2<len2; i2++){
let data47 = data46[i2];
if(data47 && typeof data47 == "object" && !Array.isArray(data47)){
if(data47.key === undefined){
const err86 = {instancePath:instancePath+"/fields/" + i2,schemaPath:"#/oneOf/9/properties/fields/items/required",keyword:"required",params:{missingProperty: "key"},message:"must have required property '"+"key"+"'"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
if(data47.keySpan === undefined){
const err87 = {instancePath:instancePath+"/fields/" + i2,schemaPath:"#/oneOf/9/properties/fields/items/required",keyword:"required",params:{missingProperty: "keySpan"},message:"must have required property '"+"keySpan"+"'"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
if(data47.value === undefined){
const err88 = {instancePath:instancePath+"/fields/" + i2,schemaPath:"#/oneOf/9/properties/fields/items/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
for(const key10 in data47){
if(!(((key10 === "key") || (key10 === "keySpan")) || (key10 === "value"))){
const err89 = {instancePath:instancePath+"/fields/" + i2,schemaPath:"#/oneOf/9/properties/fields/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key10},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
if(data47.key !== undefined){
if(typeof data47.key !== "string"){
const err90 = {instancePath:instancePath+"/fields/" + i2+"/key",schemaPath:"#/oneOf/9/properties/fields/items/properties/key/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
if(data47.keySpan !== undefined){
if(!(validate64(data47.keySpan, {instancePath:instancePath+"/fields/" + i2+"/keySpan",parentData:data47,parentDataProperty:"keySpan",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
errors = vErrors.length;
}
}
if(data47.value !== undefined){
if(!(wrapper5.validate(data47.value, {instancePath:instancePath+"/fields/" + i2+"/value",parentData:data47,parentDataProperty:"value",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? wrapper5.validate.errors : vErrors.concat(wrapper5.validate.errors);
errors = vErrors.length;
}
}
}
else {
const err91 = {instancePath:instancePath+"/fields/" + i2,schemaPath:"#/oneOf/9/properties/fields/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
}
else {
const err92 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/9/properties/fields/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
}
}
else {
const err93 = {instancePath,schemaPath:"#/oneOf/9/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
var _valid0 = _errs80 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 9];
}
else {
if(_valid0){
valid0 = true;
passing0 = 9;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
}
}
}
}
}
if(!valid0){
const err94 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate63.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate63.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate62(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="urn:diffdevil:ast:1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate62.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(!(validate63(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
errors = vErrors.length;
}
else {
var props0 = validate63.evaluated.props;
}
validate62.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate62.evaluated = {"dynamicProps":true,"dynamicItems":false};

exports.policy = validate82;
const schema27 = {"type":"object","properties":{"version":{"const":1},"language":{"const":"diffdevil-expr/1"},"presets":{"type":"array","items":{"enum":["size@1"]},"uniqueItems":true},"size":{"type":"object","properties":{"metric":{"type":"string","minLength":1},"thresholds":{"type":"object","properties":{"xs":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"s":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"m":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"l":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":false,"required":["xs","s","m","l"]},"labels":{"type":"object","properties":{"xs":{"type":"string","minLength":1},"s":{"type":"string","minLength":1},"m":{"type":"string","minLength":1},"l":{"type":"string","minLength":1},"xl":{"type":"string","minLength":1},"unknown":{"type":"string","minLength":1}},"additionalProperties":false,"required":["xs","s","m","l","xl","unknown"]}},"additionalProperties":false},"measurement":{"type":"object","properties":{"replacementLines":{"const":"replacement-lines-v1"}},"additionalProperties":false,"required":["replacementLines"]},"defaults":{"type":"object","properties":{"paths":{"type":"object","properties":{"includeOnly":{"type":"array","items":{"type":"string"},"uniqueItems":true},"exclude":{"type":"array","items":{"type":"string"},"uniqueItems":true},"forceInclude":{"type":"array","items":{"type":"string"},"uniqueItems":true}},"additionalProperties":false}},"additionalProperties":false},"scopes":{"type":"object","additionalProperties":{"type":"object","properties":{"includeOnly":{"type":"array","items":{"type":"string"},"uniqueItems":true},"exclude":{"type":"array","items":{"type":"string"},"uniqueItems":true},"forceInclude":{"type":"array","items":{"type":"string"},"uniqueItems":true}},"additionalProperties":false},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"parameters":{"type":"object","additionalProperties":{"type":"object","properties":{"type":{"enum":["integer","float","boolean","string"]},"default":{"type":["number","boolean","string"]},"required":{"const":true}},"additionalProperties":false,"required":["type"],"oneOf":[{"required":["default"],"not":{"required":["required"]}},{"required":["required"],"not":{"required":["default"]}}],"allOf":[{"if":{"properties":{"type":{"const":"integer"}},"required":["type"]},"then":{"properties":{"default":{"type":"integer","minimum":-9007199254740991,"maximum":9007199254740991}}}},{"if":{"properties":{"type":{"const":"float"}},"required":["type"]},"then":{"properties":{"default":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}}}},{"if":{"properties":{"type":{"const":"boolean"}},"required":["type"]},"then":{"properties":{"default":{"type":"boolean"}}}},{"if":{"properties":{"type":{"const":"string"}},"required":["type"]},"then":{"properties":{"default":{"type":"string"}}}}]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"metrics":{"type":"object","additionalProperties":{"oneOf":[{"type":"object","properties":{"measure":{"enum":["raw.added","raw.deleted","raw.churn","lines.added","lines.deleted","lines.modified","lines.changed","files.total","files.included","files.excluded","files.added","files.deleted","files.modified","files.renamed","files.copied","files.binary","files.unmeasurable"]},"scope":{"type":"string","minLength":1}},"additionalProperties":false,"required":["measure"]},{"type":"object","properties":{"formula":{"type":"string","minLength":1}},"additionalProperties":false,"required":["formula"]}]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"bands":{"type":"object","additionalProperties":{"type":"object","properties":{"value":{"type":"string","minLength":1},"minimum":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"ranges":{"type":"array","items":{"oneOf":[{"type":"object","properties":{"id":{"type":"string","minLength":1},"lt":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":false,"required":["id","lt"]},{"type":"object","properties":{"id":{"type":"string","minLength":1},"otherwise":{"const":true}},"additionalProperties":false,"required":["id","otherwise"]}]},"minItems":1}},"additionalProperties":false,"required":["value","ranges"]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"queries":{"type":"object","additionalProperties":{"type":"object","properties":{"expression":{"type":"string","minLength":1}},"additionalProperties":false,"required":["expression"]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"labelGroups":{"type":"object","additionalProperties":{"type":"array","items":{"type":"string","minLength":1},"minItems":1,"uniqueItems":true},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"labelDefinitions":{"type":"object","additionalProperties":{"type":"object","properties":{"color":{"type":"string","pattern":"^[0-9a-fA-F]{6}$"},"description":{"type":"string","maxLength":100}},"additionalProperties":false,"required":["color","description"]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"rules":{"type":"object","additionalProperties":{"oneOf":[{"type":"object","properties":{"when":{"type":"string","minLength":1},"onUnknown":{"enum":["hold","fail"]},"effects":{"type":"object","properties":{"labels":{"type":"object","properties":{"add":{"type":"array","items":{"type":"string","minLength":1},"minItems":1,"uniqueItems":true},"removeWhenFalse":{"type":"boolean"}},"additionalProperties":false,"required":["add"]},"comment":{"type":"object","properties":{"mode":{"enum":["create","once","upsert","once-per-transition"]},"trigger":{"enum":["always","matched","band-changed"]},"template":{"type":"string"},"templateFile":{"type":"string","minLength":1}},"additionalProperties":false,"required":["mode"],"oneOf":[{"required":["template"],"not":{"required":["templateFile"]}},{"required":["templateFile"],"not":{"required":["template"]}}]}},"additionalProperties":false,"required":[]}},"additionalProperties":false,"required":["when"]},{"type":"object","properties":{"band":{"type":"string","minLength":1},"onUnknown":{"enum":["hold","fail"]},"effects":{"type":"object","properties":{"labels":{"type":"object","properties":{"group":{"type":"string","minLength":1},"byBand":{"type":"object","additionalProperties":{"type":"string","minLength":1},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"unknown":{"type":"string","minLength":1}},"additionalProperties":false,"required":["group","byBand"]},"comment":{"type":"object","properties":{"mode":{"enum":["create","once","upsert","once-per-transition"]},"trigger":{"enum":["always","matched","band-changed"]},"template":{"type":"string"},"templateFile":{"type":"string","minLength":1}},"additionalProperties":false,"required":["mode"],"oneOf":[{"required":["template"],"not":{"required":["templateFile"]}},{"required":["templateFile"],"not":{"required":["template"]}}]}},"additionalProperties":false,"required":[]}},"additionalProperties":false,"required":["band"]}]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}}},"additionalProperties":false,"required":["version"],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:diffdevil:policy:1","title":"diffdevil policy version 1","description":"Strict authoring schema. Semantic validation additionally checks names, types, metric cycles, path patterns, band ordering, cross references, preset overrides, and effect conflicts."};
const func9 = Object.prototype.hasOwnProperty;
const func0 = require("ajv/dist/runtime/equal").default;
const pattern3 = new RegExp("^[0-9a-fA-F]{6}$", "u");

function validate82(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="urn:diffdevil:policy:1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate82.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.version === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(func9.call(schema27.properties, key0))){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.version !== undefined){
if(1 !== data.version){
const err2 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.language !== undefined){
if("diffdevil-expr/1" !== data.language){
const err3 = {instancePath:instancePath+"/language",schemaPath:"#/properties/language/const",keyword:"const",params:{allowedValue: "diffdevil-expr/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.presets !== undefined){
let data2 = data.presets;
if(Array.isArray(data2)){
const len0 = data2.length;
for(let i0=0; i0<len0; i0++){
if(!(data2[i0] === "size@1")){
const err4 = {instancePath:instancePath+"/presets/" + i0,schemaPath:"#/properties/presets/items/enum",keyword:"enum",params:{allowedValues: schema27.properties.presets.items.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
let i1 = data2.length;
let j0;
if(i1 > 1){
outer0:
for(;i1--;){
for(j0 = i1; j0--;){
if(func0(data2[i1], data2[j0])){
const err5 = {instancePath:instancePath+"/presets",schemaPath:"#/properties/presets/uniqueItems",keyword:"uniqueItems",params:{i: i1, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i1+" are identical)"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
break outer0;
}
}
}
}
}
else {
const err6 = {instancePath:instancePath+"/presets",schemaPath:"#/properties/presets/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.size !== undefined){
let data4 = data.size;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
for(const key1 in data4){
if(!(((key1 === "metric") || (key1 === "thresholds")) || (key1 === "labels"))){
const err7 = {instancePath:instancePath+"/size",schemaPath:"#/properties/size/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data4.metric !== undefined){
let data5 = data4.metric;
if(typeof data5 === "string"){
if(func1(data5) < 1){
const err8 = {instancePath:instancePath+"/size/metric",schemaPath:"#/properties/size/properties/metric/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/size/metric",schemaPath:"#/properties/size/properties/metric/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data4.thresholds !== undefined){
let data6 = data4.thresholds;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.xs === undefined){
const err10 = {instancePath:instancePath+"/size/thresholds",schemaPath:"#/properties/size/properties/thresholds/required",keyword:"required",params:{missingProperty: "xs"},message:"must have required property '"+"xs"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data6.s === undefined){
const err11 = {instancePath:instancePath+"/size/thresholds",schemaPath:"#/properties/size/properties/thresholds/required",keyword:"required",params:{missingProperty: "s"},message:"must have required property '"+"s"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data6.m === undefined){
const err12 = {instancePath:instancePath+"/size/thresholds",schemaPath:"#/properties/size/properties/thresholds/required",keyword:"required",params:{missingProperty: "m"},message:"must have required property '"+"m"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data6.l === undefined){
const err13 = {instancePath:instancePath+"/size/thresholds",schemaPath:"#/properties/size/properties/thresholds/required",keyword:"required",params:{missingProperty: "l"},message:"must have required property '"+"l"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
for(const key2 in data6){
if(!((((key2 === "xs") || (key2 === "s")) || (key2 === "m")) || (key2 === "l"))){
const err14 = {instancePath:instancePath+"/size/thresholds",schemaPath:"#/properties/size/properties/thresholds/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data6.xs !== undefined){
let data7 = data6.xs;
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 1.7976931348623157e+308 || isNaN(data7)){
const err15 = {instancePath:instancePath+"/size/thresholds/xs",schemaPath:"#/properties/size/properties/thresholds/properties/xs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data7 < -1.7976931348623157e+308 || isNaN(data7)){
const err16 = {instancePath:instancePath+"/size/thresholds/xs",schemaPath:"#/properties/size/properties/thresholds/properties/xs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/size/thresholds/xs",schemaPath:"#/properties/size/properties/thresholds/properties/xs/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data6.s !== undefined){
let data8 = data6.s;
if((typeof data8 == "number") && (isFinite(data8))){
if(data8 > 1.7976931348623157e+308 || isNaN(data8)){
const err18 = {instancePath:instancePath+"/size/thresholds/s",schemaPath:"#/properties/size/properties/thresholds/properties/s/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data8 < -1.7976931348623157e+308 || isNaN(data8)){
const err19 = {instancePath:instancePath+"/size/thresholds/s",schemaPath:"#/properties/size/properties/thresholds/properties/s/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
else {
const err20 = {instancePath:instancePath+"/size/thresholds/s",schemaPath:"#/properties/size/properties/thresholds/properties/s/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data6.m !== undefined){
let data9 = data6.m;
if((typeof data9 == "number") && (isFinite(data9))){
if(data9 > 1.7976931348623157e+308 || isNaN(data9)){
const err21 = {instancePath:instancePath+"/size/thresholds/m",schemaPath:"#/properties/size/properties/thresholds/properties/m/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data9 < -1.7976931348623157e+308 || isNaN(data9)){
const err22 = {instancePath:instancePath+"/size/thresholds/m",schemaPath:"#/properties/size/properties/thresholds/properties/m/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
else {
const err23 = {instancePath:instancePath+"/size/thresholds/m",schemaPath:"#/properties/size/properties/thresholds/properties/m/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data6.l !== undefined){
let data10 = data6.l;
if((typeof data10 == "number") && (isFinite(data10))){
if(data10 > 1.7976931348623157e+308 || isNaN(data10)){
const err24 = {instancePath:instancePath+"/size/thresholds/l",schemaPath:"#/properties/size/properties/thresholds/properties/l/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data10 < -1.7976931348623157e+308 || isNaN(data10)){
const err25 = {instancePath:instancePath+"/size/thresholds/l",schemaPath:"#/properties/size/properties/thresholds/properties/l/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
else {
const err26 = {instancePath:instancePath+"/size/thresholds/l",schemaPath:"#/properties/size/properties/thresholds/properties/l/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
}
else {
const err27 = {instancePath:instancePath+"/size/thresholds",schemaPath:"#/properties/size/properties/thresholds/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data4.labels !== undefined){
let data11 = data4.labels;
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.xs === undefined){
const err28 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/required",keyword:"required",params:{missingProperty: "xs"},message:"must have required property '"+"xs"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data11.s === undefined){
const err29 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/required",keyword:"required",params:{missingProperty: "s"},message:"must have required property '"+"s"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data11.m === undefined){
const err30 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/required",keyword:"required",params:{missingProperty: "m"},message:"must have required property '"+"m"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data11.l === undefined){
const err31 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/required",keyword:"required",params:{missingProperty: "l"},message:"must have required property '"+"l"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data11.xl === undefined){
const err32 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/required",keyword:"required",params:{missingProperty: "xl"},message:"must have required property '"+"xl"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data11.unknown === undefined){
const err33 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/required",keyword:"required",params:{missingProperty: "unknown"},message:"must have required property '"+"unknown"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
for(const key3 in data11){
if(!((((((key3 === "xs") || (key3 === "s")) || (key3 === "m")) || (key3 === "l")) || (key3 === "xl")) || (key3 === "unknown"))){
const err34 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data11.xs !== undefined){
let data12 = data11.xs;
if(typeof data12 === "string"){
if(func1(data12) < 1){
const err35 = {instancePath:instancePath+"/size/labels/xs",schemaPath:"#/properties/size/properties/labels/properties/xs/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
else {
const err36 = {instancePath:instancePath+"/size/labels/xs",schemaPath:"#/properties/size/properties/labels/properties/xs/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data11.s !== undefined){
let data13 = data11.s;
if(typeof data13 === "string"){
if(func1(data13) < 1){
const err37 = {instancePath:instancePath+"/size/labels/s",schemaPath:"#/properties/size/properties/labels/properties/s/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
else {
const err38 = {instancePath:instancePath+"/size/labels/s",schemaPath:"#/properties/size/properties/labels/properties/s/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data11.m !== undefined){
let data14 = data11.m;
if(typeof data14 === "string"){
if(func1(data14) < 1){
const err39 = {instancePath:instancePath+"/size/labels/m",schemaPath:"#/properties/size/properties/labels/properties/m/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
else {
const err40 = {instancePath:instancePath+"/size/labels/m",schemaPath:"#/properties/size/properties/labels/properties/m/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data11.l !== undefined){
let data15 = data11.l;
if(typeof data15 === "string"){
if(func1(data15) < 1){
const err41 = {instancePath:instancePath+"/size/labels/l",schemaPath:"#/properties/size/properties/labels/properties/l/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
else {
const err42 = {instancePath:instancePath+"/size/labels/l",schemaPath:"#/properties/size/properties/labels/properties/l/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data11.xl !== undefined){
let data16 = data11.xl;
if(typeof data16 === "string"){
if(func1(data16) < 1){
const err43 = {instancePath:instancePath+"/size/labels/xl",schemaPath:"#/properties/size/properties/labels/properties/xl/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
else {
const err44 = {instancePath:instancePath+"/size/labels/xl",schemaPath:"#/properties/size/properties/labels/properties/xl/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data11.unknown !== undefined){
let data17 = data11.unknown;
if(typeof data17 === "string"){
if(func1(data17) < 1){
const err45 = {instancePath:instancePath+"/size/labels/unknown",schemaPath:"#/properties/size/properties/labels/properties/unknown/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
else {
const err46 = {instancePath:instancePath+"/size/labels/unknown",schemaPath:"#/properties/size/properties/labels/properties/unknown/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
}
else {
const err47 = {instancePath:instancePath+"/size/labels",schemaPath:"#/properties/size/properties/labels/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
}
else {
const err48 = {instancePath:instancePath+"/size",schemaPath:"#/properties/size/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data.measurement !== undefined){
let data18 = data.measurement;
if(data18 && typeof data18 == "object" && !Array.isArray(data18)){
if(data18.replacementLines === undefined){
const err49 = {instancePath:instancePath+"/measurement",schemaPath:"#/properties/measurement/required",keyword:"required",params:{missingProperty: "replacementLines"},message:"must have required property '"+"replacementLines"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
for(const key4 in data18){
if(!(key4 === "replacementLines")){
const err50 = {instancePath:instancePath+"/measurement",schemaPath:"#/properties/measurement/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data18.replacementLines !== undefined){
if("replacement-lines-v1" !== data18.replacementLines){
const err51 = {instancePath:instancePath+"/measurement/replacementLines",schemaPath:"#/properties/measurement/properties/replacementLines/const",keyword:"const",params:{allowedValue: "replacement-lines-v1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/measurement",schemaPath:"#/properties/measurement/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.defaults !== undefined){
let data20 = data.defaults;
if(data20 && typeof data20 == "object" && !Array.isArray(data20)){
for(const key5 in data20){
if(!(key5 === "paths")){
const err53 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data20.paths !== undefined){
let data21 = data20.paths;
if(data21 && typeof data21 == "object" && !Array.isArray(data21)){
for(const key6 in data21){
if(!(((key6 === "includeOnly") || (key6 === "exclude")) || (key6 === "forceInclude"))){
const err54 = {instancePath:instancePath+"/defaults/paths",schemaPath:"#/properties/defaults/properties/paths/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data21.includeOnly !== undefined){
let data22 = data21.includeOnly;
if(Array.isArray(data22)){
const len1 = data22.length;
for(let i2=0; i2<len1; i2++){
if(typeof data22[i2] !== "string"){
const err55 = {instancePath:instancePath+"/defaults/paths/includeOnly/" + i2,schemaPath:"#/properties/defaults/properties/paths/properties/includeOnly/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
let i3 = data22.length;
let j1;
if(i3 > 1){
const indices0 = {};
for(;i3--;){
let item0 = data22[i3];
if(typeof item0 !== "string"){
continue;
}
if(typeof indices0[item0] == "number"){
j1 = indices0[item0];
const err56 = {instancePath:instancePath+"/defaults/paths/includeOnly",schemaPath:"#/properties/defaults/properties/paths/properties/includeOnly/uniqueItems",keyword:"uniqueItems",params:{i: i3, j: j1},message:"must NOT have duplicate items (items ## "+j1+" and "+i3+" are identical)"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
break;
}
indices0[item0] = i3;
}
}
}
else {
const err57 = {instancePath:instancePath+"/defaults/paths/includeOnly",schemaPath:"#/properties/defaults/properties/paths/properties/includeOnly/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data21.exclude !== undefined){
let data24 = data21.exclude;
if(Array.isArray(data24)){
const len2 = data24.length;
for(let i4=0; i4<len2; i4++){
if(typeof data24[i4] !== "string"){
const err58 = {instancePath:instancePath+"/defaults/paths/exclude/" + i4,schemaPath:"#/properties/defaults/properties/paths/properties/exclude/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
let i5 = data24.length;
let j2;
if(i5 > 1){
const indices1 = {};
for(;i5--;){
let item1 = data24[i5];
if(typeof item1 !== "string"){
continue;
}
if(typeof indices1[item1] == "number"){
j2 = indices1[item1];
const err59 = {instancePath:instancePath+"/defaults/paths/exclude",schemaPath:"#/properties/defaults/properties/paths/properties/exclude/uniqueItems",keyword:"uniqueItems",params:{i: i5, j: j2},message:"must NOT have duplicate items (items ## "+j2+" and "+i5+" are identical)"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
break;
}
indices1[item1] = i5;
}
}
}
else {
const err60 = {instancePath:instancePath+"/defaults/paths/exclude",schemaPath:"#/properties/defaults/properties/paths/properties/exclude/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data21.forceInclude !== undefined){
let data26 = data21.forceInclude;
if(Array.isArray(data26)){
const len3 = data26.length;
for(let i6=0; i6<len3; i6++){
if(typeof data26[i6] !== "string"){
const err61 = {instancePath:instancePath+"/defaults/paths/forceInclude/" + i6,schemaPath:"#/properties/defaults/properties/paths/properties/forceInclude/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
let i7 = data26.length;
let j3;
if(i7 > 1){
const indices2 = {};
for(;i7--;){
let item2 = data26[i7];
if(typeof item2 !== "string"){
continue;
}
if(typeof indices2[item2] == "number"){
j3 = indices2[item2];
const err62 = {instancePath:instancePath+"/defaults/paths/forceInclude",schemaPath:"#/properties/defaults/properties/paths/properties/forceInclude/uniqueItems",keyword:"uniqueItems",params:{i: i7, j: j3},message:"must NOT have duplicate items (items ## "+j3+" and "+i7+" are identical)"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
break;
}
indices2[item2] = i7;
}
}
}
else {
const err63 = {instancePath:instancePath+"/defaults/paths/forceInclude",schemaPath:"#/properties/defaults/properties/paths/properties/forceInclude/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
}
else {
const err64 = {instancePath:instancePath+"/defaults/paths",schemaPath:"#/properties/defaults/properties/paths/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
}
}
else {
const err65 = {instancePath:instancePath+"/defaults",schemaPath:"#/properties/defaults/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data.scopes !== undefined){
let data28 = data.scopes;
if(data28 && typeof data28 == "object" && !Array.isArray(data28)){
for(const key7 in data28){
const _errs62 = errors;
const _errs63 = errors;
const _errs64 = errors;
if(!(((key7 === "__proto__") || (key7 === "constructor")) || (key7 === "prototype"))){
const err66 = {};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
var valid20 = _errs64 === errors;
if(valid20){
const err67 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key7};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
else {
errors = _errs63;
if(vErrors !== null){
if(_errs63){
vErrors.length = _errs63;
}
else {
vErrors = null;
}
}
}
if(typeof key7 === "string"){
if(func1(key7) < 1){
const err68 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key7};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
var valid19 = _errs62 === errors;
if(!valid19){
const err69 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/propertyNames",keyword:"propertyNames",params:{propertyName: key7},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
for(const key8 in data28){
let data29 = data28[key8];
if(data29 && typeof data29 == "object" && !Array.isArray(data29)){
for(const key9 in data29){
if(!(((key9 === "includeOnly") || (key9 === "exclude")) || (key9 === "forceInclude"))){
const err70 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/scopes/additionalProperties/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
if(data29.includeOnly !== undefined){
let data30 = data29.includeOnly;
if(Array.isArray(data30)){
const len4 = data30.length;
for(let i8=0; i8<len4; i8++){
if(typeof data30[i8] !== "string"){
const err71 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/includeOnly/" + i8,schemaPath:"#/properties/scopes/additionalProperties/properties/includeOnly/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
let i9 = data30.length;
let j4;
if(i9 > 1){
const indices3 = {};
for(;i9--;){
let item3 = data30[i9];
if(typeof item3 !== "string"){
continue;
}
if(typeof indices3[item3] == "number"){
j4 = indices3[item3];
const err72 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/includeOnly",schemaPath:"#/properties/scopes/additionalProperties/properties/includeOnly/uniqueItems",keyword:"uniqueItems",params:{i: i9, j: j4},message:"must NOT have duplicate items (items ## "+j4+" and "+i9+" are identical)"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
break;
}
indices3[item3] = i9;
}
}
}
else {
const err73 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/includeOnly",schemaPath:"#/properties/scopes/additionalProperties/properties/includeOnly/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
if(data29.exclude !== undefined){
let data32 = data29.exclude;
if(Array.isArray(data32)){
const len5 = data32.length;
for(let i10=0; i10<len5; i10++){
if(typeof data32[i10] !== "string"){
const err74 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/exclude/" + i10,schemaPath:"#/properties/scopes/additionalProperties/properties/exclude/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
let i11 = data32.length;
let j5;
if(i11 > 1){
const indices4 = {};
for(;i11--;){
let item4 = data32[i11];
if(typeof item4 !== "string"){
continue;
}
if(typeof indices4[item4] == "number"){
j5 = indices4[item4];
const err75 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/exclude",schemaPath:"#/properties/scopes/additionalProperties/properties/exclude/uniqueItems",keyword:"uniqueItems",params:{i: i11, j: j5},message:"must NOT have duplicate items (items ## "+j5+" and "+i11+" are identical)"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
break;
}
indices4[item4] = i11;
}
}
}
else {
const err76 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/exclude",schemaPath:"#/properties/scopes/additionalProperties/properties/exclude/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
if(data29.forceInclude !== undefined){
let data34 = data29.forceInclude;
if(Array.isArray(data34)){
const len6 = data34.length;
for(let i12=0; i12<len6; i12++){
if(typeof data34[i12] !== "string"){
const err77 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/forceInclude/" + i12,schemaPath:"#/properties/scopes/additionalProperties/properties/forceInclude/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
let i13 = data34.length;
let j6;
if(i13 > 1){
const indices5 = {};
for(;i13--;){
let item5 = data34[i13];
if(typeof item5 !== "string"){
continue;
}
if(typeof indices5[item5] == "number"){
j6 = indices5[item5];
const err78 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/forceInclude",schemaPath:"#/properties/scopes/additionalProperties/properties/forceInclude/uniqueItems",keyword:"uniqueItems",params:{i: i13, j: j6},message:"must NOT have duplicate items (items ## "+j6+" and "+i13+" are identical)"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
break;
}
indices5[item5] = i13;
}
}
}
else {
const err79 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1")+"/forceInclude",schemaPath:"#/properties/scopes/additionalProperties/properties/forceInclude/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath:instancePath+"/scopes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/scopes/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
}
else {
const err81 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
if(data.parameters !== undefined){
let data36 = data.parameters;
if(data36 && typeof data36 == "object" && !Array.isArray(data36)){
for(const key10 in data36){
const _errs83 = errors;
const _errs84 = errors;
const _errs85 = errors;
if(!(((key10 === "__proto__") || (key10 === "constructor")) || (key10 === "prototype"))){
const err82 = {};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
var valid33 = _errs85 === errors;
if(valid33){
const err83 = {instancePath:instancePath+"/parameters",schemaPath:"#/properties/parameters/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key10};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
else {
errors = _errs84;
if(vErrors !== null){
if(_errs84){
vErrors.length = _errs84;
}
else {
vErrors = null;
}
}
}
if(typeof key10 === "string"){
if(func1(key10) < 1){
const err84 = {instancePath:instancePath+"/parameters",schemaPath:"#/properties/parameters/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key10};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
var valid32 = _errs83 === errors;
if(!valid32){
const err85 = {instancePath:instancePath+"/parameters",schemaPath:"#/properties/parameters/propertyNames",keyword:"propertyNames",params:{propertyName: key10},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
for(const key11 in data36){
let data37 = data36[key11];
const _errs89 = errors;
let valid35 = false;
let passing0 = null;
const _errs90 = errors;
const _errs91 = errors;
const _errs92 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
let missing0;
if((data37.required === undefined) && (missing0 = "required")){
const err86 = {};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
var valid36 = _errs92 === errors;
if(valid36){
const err87 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/oneOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
else {
errors = _errs91;
if(vErrors !== null){
if(_errs91){
vErrors.length = _errs91;
}
else {
vErrors = null;
}
}
}
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.default === undefined){
const err88 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/oneOf/0/required",keyword:"required",params:{missingProperty: "default"},message:"must have required property '"+"default"+"'"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
var _valid0 = _errs90 === errors;
if(_valid0){
valid35 = true;
passing0 = 0;
}
const _errs93 = errors;
const _errs94 = errors;
const _errs95 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
let missing1;
if((data37.default === undefined) && (missing1 = "default")){
const err89 = {};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
var valid37 = _errs95 === errors;
if(valid37){
const err90 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
else {
errors = _errs94;
if(vErrors !== null){
if(_errs94){
vErrors.length = _errs94;
}
else {
vErrors = null;
}
}
}
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.required === undefined){
const err91 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/oneOf/1/required",keyword:"required",params:{missingProperty: "required"},message:"must have required property '"+"required"+"'"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
var _valid0 = _errs93 === errors;
if(_valid0 && valid35){
valid35 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid35 = true;
passing0 = 1;
}
}
if(!valid35){
const err92 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
else {
errors = _errs89;
if(vErrors !== null){
if(_errs89){
vErrors.length = _errs89;
}
else {
vErrors = null;
}
}
}
const _errs97 = errors;
let valid39 = true;
const _errs98 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
let missing2;
if((data37.type === undefined) && (missing2 = "type")){
const err93 = {};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
else {
if(data37.type !== undefined){
if("integer" !== data37.type){
const err94 = {};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
}
}
var _valid1 = _errs98 === errors;
errors = _errs97;
if(vErrors !== null){
if(_errs97){
vErrors.length = _errs97;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs100 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.default !== undefined){
let data39 = data37.default;
if(!(((typeof data39 == "number") && (!(data39 % 1) && !isNaN(data39))) && (isFinite(data39)))){
const err95 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/0/then/properties/default/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
if((typeof data39 == "number") && (isFinite(data39))){
if(data39 > 9007199254740991 || isNaN(data39)){
const err96 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/0/then/properties/default/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
if(data39 < -9007199254740991 || isNaN(data39)){
const err97 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/0/then/properties/default/minimum",keyword:"minimum",params:{comparison: ">=", limit: -9007199254740991},message:"must be >= -9007199254740991"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
}
}
}
var _valid1 = _errs100 === errors;
valid39 = _valid1;
if(valid39){
var props0 = {};
props0.default = true;
props0.type = true;
}
}
if(!valid39){
const err98 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
const _errs104 = errors;
let valid42 = true;
const _errs105 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
let missing3;
if((data37.type === undefined) && (missing3 = "type")){
const err99 = {};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
else {
if(data37.type !== undefined){
if("float" !== data37.type){
const err100 = {};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
}
}
}
var _valid2 = _errs105 === errors;
errors = _errs104;
if(vErrors !== null){
if(_errs104){
vErrors.length = _errs104;
}
else {
vErrors = null;
}
}
if(_valid2){
const _errs107 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.default !== undefined){
let data41 = data37.default;
if((typeof data41 == "number") && (isFinite(data41))){
if(data41 > 1.7976931348623157e+308 || isNaN(data41)){
const err101 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/1/then/properties/default/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
if(data41 < -1.7976931348623157e+308 || isNaN(data41)){
const err102 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/1/then/properties/default/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
}
else {
const err103 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/1/then/properties/default/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
}
}
var _valid2 = _errs107 === errors;
valid42 = _valid2;
if(valid42){
var props1 = {};
props1.default = true;
props1.type = true;
}
}
if(!valid42){
const err104 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
const _errs111 = errors;
let valid45 = true;
const _errs112 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
let missing4;
if((data37.type === undefined) && (missing4 = "type")){
const err105 = {};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
else {
if(data37.type !== undefined){
if("boolean" !== data37.type){
const err106 = {};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
}
}
}
var _valid3 = _errs112 === errors;
errors = _errs111;
if(vErrors !== null){
if(_errs111){
vErrors.length = _errs111;
}
else {
vErrors = null;
}
}
if(_valid3){
const _errs114 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.default !== undefined){
if(typeof data37.default !== "boolean"){
const err107 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/2/then/properties/default/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
}
}
var _valid3 = _errs114 === errors;
valid45 = _valid3;
if(valid45){
var props2 = {};
props2.default = true;
props2.type = true;
}
}
if(!valid45){
const err108 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/allOf/2/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
if(props0 !== true && props2 !== undefined){
if(props2 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props2);
}
}
const _errs118 = errors;
let valid48 = true;
const _errs119 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
let missing5;
if((data37.type === undefined) && (missing5 = "type")){
const err109 = {};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
else {
if(data37.type !== undefined){
if("string" !== data37.type){
const err110 = {};
if(vErrors === null){
vErrors = [err110];
}
else {
vErrors.push(err110);
}
errors++;
}
}
}
}
var _valid4 = _errs119 === errors;
errors = _errs118;
if(vErrors !== null){
if(_errs118){
vErrors.length = _errs118;
}
else {
vErrors = null;
}
}
if(_valid4){
const _errs121 = errors;
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.default !== undefined){
if(typeof data37.default !== "string"){
const err111 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/allOf/3/then/properties/default/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err111];
}
else {
vErrors.push(err111);
}
errors++;
}
}
}
var _valid4 = _errs121 === errors;
valid48 = _valid4;
if(valid48){
var props3 = {};
props3.default = true;
props3.type = true;
}
}
if(!valid48){
const err112 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/allOf/3/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err112];
}
else {
vErrors.push(err112);
}
errors++;
}
if(props0 !== true && props3 !== undefined){
if(props3 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props3);
}
}
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.type === undefined){
const err113 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err113];
}
else {
vErrors.push(err113);
}
errors++;
}
for(const key12 in data37){
if(!(((key12 === "type") || (key12 === "default")) || (key12 === "required"))){
const err114 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key12},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err114];
}
else {
vErrors.push(err114);
}
errors++;
}
}
if(data37.type !== undefined){
let data46 = data37.type;
if(!((((data46 === "integer") || (data46 === "float")) || (data46 === "boolean")) || (data46 === "string"))){
const err115 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/type",schemaPath:"#/properties/parameters/additionalProperties/properties/type/enum",keyword:"enum",params:{allowedValues: schema27.properties.parameters.additionalProperties.properties.type.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err115];
}
else {
vErrors.push(err115);
}
errors++;
}
}
if(data37.default !== undefined){
let data47 = data37.default;
if(((!((typeof data47 == "number") && (isFinite(data47)))) && (typeof data47 !== "boolean")) && (typeof data47 !== "string")){
const err116 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/default",schemaPath:"#/properties/parameters/additionalProperties/properties/default/type",keyword:"type",params:{type: schema27.properties.parameters.additionalProperties.properties.default.type},message:"must be number,boolean,string"};
if(vErrors === null){
vErrors = [err116];
}
else {
vErrors.push(err116);
}
errors++;
}
}
if(data37.required !== undefined){
if(true !== data37.required){
const err117 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1")+"/required",schemaPath:"#/properties/parameters/additionalProperties/properties/required/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err117];
}
else {
vErrors.push(err117);
}
errors++;
}
}
}
else {
const err118 = {instancePath:instancePath+"/parameters/" + key11.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/parameters/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err118];
}
else {
vErrors.push(err118);
}
errors++;
}
}
}
else {
const err119 = {instancePath:instancePath+"/parameters",schemaPath:"#/properties/parameters/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err119];
}
else {
vErrors.push(err119);
}
errors++;
}
}
if(data.metrics !== undefined){
let data49 = data.metrics;
if(data49 && typeof data49 == "object" && !Array.isArray(data49)){
for(const key13 in data49){
const _errs131 = errors;
const _errs132 = errors;
const _errs133 = errors;
if(!(((key13 === "__proto__") || (key13 === "constructor")) || (key13 === "prototype"))){
const err120 = {};
if(vErrors === null){
vErrors = [err120];
}
else {
vErrors.push(err120);
}
errors++;
}
var valid53 = _errs133 === errors;
if(valid53){
const err121 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key13};
if(vErrors === null){
vErrors = [err121];
}
else {
vErrors.push(err121);
}
errors++;
}
else {
errors = _errs132;
if(vErrors !== null){
if(_errs132){
vErrors.length = _errs132;
}
else {
vErrors = null;
}
}
}
if(typeof key13 === "string"){
if(func1(key13) < 1){
const err122 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key13};
if(vErrors === null){
vErrors = [err122];
}
else {
vErrors.push(err122);
}
errors++;
}
}
var valid52 = _errs131 === errors;
if(!valid52){
const err123 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/propertyNames",keyword:"propertyNames",params:{propertyName: key13},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err123];
}
else {
vErrors.push(err123);
}
errors++;
}
}
for(const key14 in data49){
let data50 = data49[key14];
const _errs136 = errors;
let valid55 = false;
let passing1 = null;
const _errs137 = errors;
if(data50 && typeof data50 == "object" && !Array.isArray(data50)){
if(data50.measure === undefined){
const err124 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf/0/required",keyword:"required",params:{missingProperty: "measure"},message:"must have required property '"+"measure"+"'"};
if(vErrors === null){
vErrors = [err124];
}
else {
vErrors.push(err124);
}
errors++;
}
for(const key15 in data50){
if(!((key15 === "measure") || (key15 === "scope"))){
const err125 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key15},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err125];
}
else {
vErrors.push(err125);
}
errors++;
}
}
if(data50.measure !== undefined){
let data51 = data50.measure;
if(!(((((((((((((((((data51 === "raw.added") || (data51 === "raw.deleted")) || (data51 === "raw.churn")) || (data51 === "lines.added")) || (data51 === "lines.deleted")) || (data51 === "lines.modified")) || (data51 === "lines.changed")) || (data51 === "files.total")) || (data51 === "files.included")) || (data51 === "files.excluded")) || (data51 === "files.added")) || (data51 === "files.deleted")) || (data51 === "files.modified")) || (data51 === "files.renamed")) || (data51 === "files.copied")) || (data51 === "files.binary")) || (data51 === "files.unmeasurable"))){
const err126 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1")+"/measure",schemaPath:"#/properties/metrics/additionalProperties/oneOf/0/properties/measure/enum",keyword:"enum",params:{allowedValues: schema27.properties.metrics.additionalProperties.oneOf[0].properties.measure.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err126];
}
else {
vErrors.push(err126);
}
errors++;
}
}
if(data50.scope !== undefined){
let data52 = data50.scope;
if(typeof data52 === "string"){
if(func1(data52) < 1){
const err127 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1")+"/scope",schemaPath:"#/properties/metrics/additionalProperties/oneOf/0/properties/scope/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err127];
}
else {
vErrors.push(err127);
}
errors++;
}
}
else {
const err128 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1")+"/scope",schemaPath:"#/properties/metrics/additionalProperties/oneOf/0/properties/scope/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err128];
}
else {
vErrors.push(err128);
}
errors++;
}
}
}
else {
const err129 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err129];
}
else {
vErrors.push(err129);
}
errors++;
}
var _valid5 = _errs137 === errors;
if(_valid5){
valid55 = true;
passing1 = 0;
var props4 = true;
}
const _errs143 = errors;
if(data50 && typeof data50 == "object" && !Array.isArray(data50)){
if(data50.formula === undefined){
const err130 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf/1/required",keyword:"required",params:{missingProperty: "formula"},message:"must have required property '"+"formula"+"'"};
if(vErrors === null){
vErrors = [err130];
}
else {
vErrors.push(err130);
}
errors++;
}
for(const key16 in data50){
if(!(key16 === "formula")){
const err131 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key16},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err131];
}
else {
vErrors.push(err131);
}
errors++;
}
}
if(data50.formula !== undefined){
let data53 = data50.formula;
if(typeof data53 === "string"){
if(func1(data53) < 1){
const err132 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1")+"/formula",schemaPath:"#/properties/metrics/additionalProperties/oneOf/1/properties/formula/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err132];
}
else {
vErrors.push(err132);
}
errors++;
}
}
else {
const err133 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1")+"/formula",schemaPath:"#/properties/metrics/additionalProperties/oneOf/1/properties/formula/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err133];
}
else {
vErrors.push(err133);
}
errors++;
}
}
}
else {
const err134 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err134];
}
else {
vErrors.push(err134);
}
errors++;
}
var _valid5 = _errs143 === errors;
if(_valid5 && valid55){
valid55 = false;
passing1 = [passing1, 1];
}
else {
if(_valid5){
valid55 = true;
passing1 = 1;
if(props4 !== true){
props4 = true;
}
}
}
if(!valid55){
const err135 = {instancePath:instancePath+"/metrics/" + key14.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metrics/additionalProperties/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err135];
}
else {
vErrors.push(err135);
}
errors++;
}
else {
errors = _errs136;
if(vErrors !== null){
if(_errs136){
vErrors.length = _errs136;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err136 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err136];
}
else {
vErrors.push(err136);
}
errors++;
}
}
if(data.bands !== undefined){
let data54 = data.bands;
if(data54 && typeof data54 == "object" && !Array.isArray(data54)){
for(const key17 in data54){
const _errs150 = errors;
const _errs151 = errors;
const _errs152 = errors;
if(!(((key17 === "__proto__") || (key17 === "constructor")) || (key17 === "prototype"))){
const err137 = {};
if(vErrors === null){
vErrors = [err137];
}
else {
vErrors.push(err137);
}
errors++;
}
var valid59 = _errs152 === errors;
if(valid59){
const err138 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key17};
if(vErrors === null){
vErrors = [err138];
}
else {
vErrors.push(err138);
}
errors++;
}
else {
errors = _errs151;
if(vErrors !== null){
if(_errs151){
vErrors.length = _errs151;
}
else {
vErrors = null;
}
}
}
if(typeof key17 === "string"){
if(func1(key17) < 1){
const err139 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key17};
if(vErrors === null){
vErrors = [err139];
}
else {
vErrors.push(err139);
}
errors++;
}
}
var valid58 = _errs150 === errors;
if(!valid58){
const err140 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/propertyNames",keyword:"propertyNames",params:{propertyName: key17},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err140];
}
else {
vErrors.push(err140);
}
errors++;
}
}
for(const key18 in data54){
let data55 = data54[key18];
if(data55 && typeof data55 == "object" && !Array.isArray(data55)){
if(data55.value === undefined){
const err141 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err141];
}
else {
vErrors.push(err141);
}
errors++;
}
if(data55.ranges === undefined){
const err142 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/required",keyword:"required",params:{missingProperty: "ranges"},message:"must have required property '"+"ranges"+"'"};
if(vErrors === null){
vErrors = [err142];
}
else {
vErrors.push(err142);
}
errors++;
}
for(const key19 in data55){
if(!(((key19 === "value") || (key19 === "minimum")) || (key19 === "ranges"))){
const err143 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key19},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err143];
}
else {
vErrors.push(err143);
}
errors++;
}
}
if(data55.value !== undefined){
let data56 = data55.value;
if(typeof data56 === "string"){
if(func1(data56) < 1){
const err144 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/value",schemaPath:"#/properties/bands/additionalProperties/properties/value/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err144];
}
else {
vErrors.push(err144);
}
errors++;
}
}
else {
const err145 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/value",schemaPath:"#/properties/bands/additionalProperties/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err145];
}
else {
vErrors.push(err145);
}
errors++;
}
}
if(data55.minimum !== undefined){
let data57 = data55.minimum;
if((typeof data57 == "number") && (isFinite(data57))){
if(data57 > 1.7976931348623157e+308 || isNaN(data57)){
const err146 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/minimum",schemaPath:"#/properties/bands/additionalProperties/properties/minimum/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err146];
}
else {
vErrors.push(err146);
}
errors++;
}
if(data57 < -1.7976931348623157e+308 || isNaN(data57)){
const err147 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/minimum",schemaPath:"#/properties/bands/additionalProperties/properties/minimum/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err147];
}
else {
vErrors.push(err147);
}
errors++;
}
}
else {
const err148 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/minimum",schemaPath:"#/properties/bands/additionalProperties/properties/minimum/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err148];
}
else {
vErrors.push(err148);
}
errors++;
}
}
if(data55.ranges !== undefined){
let data58 = data55.ranges;
if(Array.isArray(data58)){
if(data58.length < 1){
const err149 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err149];
}
else {
vErrors.push(err149);
}
errors++;
}
const len7 = data58.length;
for(let i14=0; i14<len7; i14++){
let data59 = data58[i14];
const _errs164 = errors;
let valid64 = false;
let passing2 = null;
const _errs165 = errors;
if(data59 && typeof data59 == "object" && !Array.isArray(data59)){
if(data59.id === undefined){
const err150 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err150];
}
else {
vErrors.push(err150);
}
errors++;
}
if(data59.lt === undefined){
const err151 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/required",keyword:"required",params:{missingProperty: "lt"},message:"must have required property '"+"lt"+"'"};
if(vErrors === null){
vErrors = [err151];
}
else {
vErrors.push(err151);
}
errors++;
}
for(const key20 in data59){
if(!((key20 === "id") || (key20 === "lt"))){
const err152 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key20},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err152];
}
else {
vErrors.push(err152);
}
errors++;
}
}
if(data59.id !== undefined){
let data60 = data59.id;
if(typeof data60 === "string"){
if(func1(data60) < 1){
const err153 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/id",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err153];
}
else {
vErrors.push(err153);
}
errors++;
}
}
else {
const err154 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/id",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err154];
}
else {
vErrors.push(err154);
}
errors++;
}
}
if(data59.lt !== undefined){
let data61 = data59.lt;
if((typeof data61 == "number") && (isFinite(data61))){
if(data61 > 1.7976931348623157e+308 || isNaN(data61)){
const err155 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/lt",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/lt/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err155];
}
else {
vErrors.push(err155);
}
errors++;
}
if(data61 < -1.7976931348623157e+308 || isNaN(data61)){
const err156 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/lt",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/lt/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err156];
}
else {
vErrors.push(err156);
}
errors++;
}
}
else {
const err157 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/lt",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/lt/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err157];
}
else {
vErrors.push(err157);
}
errors++;
}
}
}
else {
const err158 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err158];
}
else {
vErrors.push(err158);
}
errors++;
}
var _valid6 = _errs165 === errors;
if(_valid6){
valid64 = true;
passing2 = 0;
var props5 = true;
}
const _errs172 = errors;
if(data59 && typeof data59 == "object" && !Array.isArray(data59)){
if(data59.id === undefined){
const err159 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err159];
}
else {
vErrors.push(err159);
}
errors++;
}
if(data59.otherwise === undefined){
const err160 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/required",keyword:"required",params:{missingProperty: "otherwise"},message:"must have required property '"+"otherwise"+"'"};
if(vErrors === null){
vErrors = [err160];
}
else {
vErrors.push(err160);
}
errors++;
}
for(const key21 in data59){
if(!((key21 === "id") || (key21 === "otherwise"))){
const err161 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key21},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err161];
}
else {
vErrors.push(err161);
}
errors++;
}
}
if(data59.id !== undefined){
let data62 = data59.id;
if(typeof data62 === "string"){
if(func1(data62) < 1){
const err162 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/id",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err162];
}
else {
vErrors.push(err162);
}
errors++;
}
}
else {
const err163 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/id",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err163];
}
else {
vErrors.push(err163);
}
errors++;
}
}
if(data59.otherwise !== undefined){
if(true !== data59.otherwise){
const err164 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14+"/otherwise",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/properties/otherwise/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err164];
}
else {
vErrors.push(err164);
}
errors++;
}
}
}
else {
const err165 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err165];
}
else {
vErrors.push(err165);
}
errors++;
}
var _valid6 = _errs172 === errors;
if(_valid6 && valid64){
valid64 = false;
passing2 = [passing2, 1];
}
else {
if(_valid6){
valid64 = true;
passing2 = 1;
if(props5 !== true){
props5 = true;
}
}
}
if(!valid64){
const err166 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges/" + i14,schemaPath:"#/properties/bands/additionalProperties/properties/ranges/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err166];
}
else {
vErrors.push(err166);
}
errors++;
}
else {
errors = _errs164;
if(vErrors !== null){
if(_errs164){
vErrors.length = _errs164;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err167 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1")+"/ranges",schemaPath:"#/properties/bands/additionalProperties/properties/ranges/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err167];
}
else {
vErrors.push(err167);
}
errors++;
}
}
}
else {
const err168 = {instancePath:instancePath+"/bands/" + key18.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err168];
}
else {
vErrors.push(err168);
}
errors++;
}
}
}
else {
const err169 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err169];
}
else {
vErrors.push(err169);
}
errors++;
}
}
if(data.queries !== undefined){
let data64 = data.queries;
if(data64 && typeof data64 == "object" && !Array.isArray(data64)){
for(const key22 in data64){
const _errs180 = errors;
const _errs181 = errors;
const _errs182 = errors;
if(!(((key22 === "__proto__") || (key22 === "constructor")) || (key22 === "prototype"))){
const err170 = {};
if(vErrors === null){
vErrors = [err170];
}
else {
vErrors.push(err170);
}
errors++;
}
var valid68 = _errs182 === errors;
if(valid68){
const err171 = {instancePath:instancePath+"/queries",schemaPath:"#/properties/queries/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key22};
if(vErrors === null){
vErrors = [err171];
}
else {
vErrors.push(err171);
}
errors++;
}
else {
errors = _errs181;
if(vErrors !== null){
if(_errs181){
vErrors.length = _errs181;
}
else {
vErrors = null;
}
}
}
if(typeof key22 === "string"){
if(func1(key22) < 1){
const err172 = {instancePath:instancePath+"/queries",schemaPath:"#/properties/queries/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key22};
if(vErrors === null){
vErrors = [err172];
}
else {
vErrors.push(err172);
}
errors++;
}
}
var valid67 = _errs180 === errors;
if(!valid67){
const err173 = {instancePath:instancePath+"/queries",schemaPath:"#/properties/queries/propertyNames",keyword:"propertyNames",params:{propertyName: key22},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err173];
}
else {
vErrors.push(err173);
}
errors++;
}
}
for(const key23 in data64){
let data65 = data64[key23];
if(data65 && typeof data65 == "object" && !Array.isArray(data65)){
if(data65.expression === undefined){
const err174 = {instancePath:instancePath+"/queries/" + key23.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/queries/additionalProperties/required",keyword:"required",params:{missingProperty: "expression"},message:"must have required property '"+"expression"+"'"};
if(vErrors === null){
vErrors = [err174];
}
else {
vErrors.push(err174);
}
errors++;
}
for(const key24 in data65){
if(!(key24 === "expression")){
const err175 = {instancePath:instancePath+"/queries/" + key23.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/queries/additionalProperties/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key24},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err175];
}
else {
vErrors.push(err175);
}
errors++;
}
}
if(data65.expression !== undefined){
let data66 = data65.expression;
if(typeof data66 === "string"){
if(func1(data66) < 1){
const err176 = {instancePath:instancePath+"/queries/" + key23.replace(/~/g, "~0").replace(/\//g, "~1")+"/expression",schemaPath:"#/properties/queries/additionalProperties/properties/expression/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err176];
}
else {
vErrors.push(err176);
}
errors++;
}
}
else {
const err177 = {instancePath:instancePath+"/queries/" + key23.replace(/~/g, "~0").replace(/\//g, "~1")+"/expression",schemaPath:"#/properties/queries/additionalProperties/properties/expression/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err177];
}
else {
vErrors.push(err177);
}
errors++;
}
}
}
else {
const err178 = {instancePath:instancePath+"/queries/" + key23.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/queries/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err178];
}
else {
vErrors.push(err178);
}
errors++;
}
}
}
else {
const err179 = {instancePath:instancePath+"/queries",schemaPath:"#/properties/queries/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err179];
}
else {
vErrors.push(err179);
}
errors++;
}
}
if(data.labelGroups !== undefined){
let data67 = data.labelGroups;
if(data67 && typeof data67 == "object" && !Array.isArray(data67)){
for(const key25 in data67){
const _errs191 = errors;
const _errs192 = errors;
const _errs193 = errors;
if(!(((key25 === "__proto__") || (key25 === "constructor")) || (key25 === "prototype"))){
const err180 = {};
if(vErrors === null){
vErrors = [err180];
}
else {
vErrors.push(err180);
}
errors++;
}
var valid72 = _errs193 === errors;
if(valid72){
const err181 = {instancePath:instancePath+"/labelGroups",schemaPath:"#/properties/labelGroups/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key25};
if(vErrors === null){
vErrors = [err181];
}
else {
vErrors.push(err181);
}
errors++;
}
else {
errors = _errs192;
if(vErrors !== null){
if(_errs192){
vErrors.length = _errs192;
}
else {
vErrors = null;
}
}
}
if(typeof key25 === "string"){
if(func1(key25) < 1){
const err182 = {instancePath:instancePath+"/labelGroups",schemaPath:"#/properties/labelGroups/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key25};
if(vErrors === null){
vErrors = [err182];
}
else {
vErrors.push(err182);
}
errors++;
}
}
var valid71 = _errs191 === errors;
if(!valid71){
const err183 = {instancePath:instancePath+"/labelGroups",schemaPath:"#/properties/labelGroups/propertyNames",keyword:"propertyNames",params:{propertyName: key25},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err183];
}
else {
vErrors.push(err183);
}
errors++;
}
}
for(const key26 in data67){
let data68 = data67[key26];
if(Array.isArray(data68)){
if(data68.length < 1){
const err184 = {instancePath:instancePath+"/labelGroups/" + key26.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelGroups/additionalProperties/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err184];
}
else {
vErrors.push(err184);
}
errors++;
}
const len8 = data68.length;
for(let i15=0; i15<len8; i15++){
let data69 = data68[i15];
if(typeof data69 === "string"){
if(func1(data69) < 1){
const err185 = {instancePath:instancePath+"/labelGroups/" + key26.replace(/~/g, "~0").replace(/\//g, "~1")+"/" + i15,schemaPath:"#/properties/labelGroups/additionalProperties/items/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err185];
}
else {
vErrors.push(err185);
}
errors++;
}
}
else {
const err186 = {instancePath:instancePath+"/labelGroups/" + key26.replace(/~/g, "~0").replace(/\//g, "~1")+"/" + i15,schemaPath:"#/properties/labelGroups/additionalProperties/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err186];
}
else {
vErrors.push(err186);
}
errors++;
}
}
let i16 = data68.length;
let j7;
if(i16 > 1){
const indices6 = {};
for(;i16--;){
let item6 = data68[i16];
if(typeof item6 !== "string"){
continue;
}
if(typeof indices6[item6] == "number"){
j7 = indices6[item6];
const err187 = {instancePath:instancePath+"/labelGroups/" + key26.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelGroups/additionalProperties/uniqueItems",keyword:"uniqueItems",params:{i: i16, j: j7},message:"must NOT have duplicate items (items ## "+j7+" and "+i16+" are identical)"};
if(vErrors === null){
vErrors = [err187];
}
else {
vErrors.push(err187);
}
errors++;
break;
}
indices6[item6] = i16;
}
}
}
else {
const err188 = {instancePath:instancePath+"/labelGroups/" + key26.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelGroups/additionalProperties/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err188];
}
else {
vErrors.push(err188);
}
errors++;
}
}
}
else {
const err189 = {instancePath:instancePath+"/labelGroups",schemaPath:"#/properties/labelGroups/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err189];
}
else {
vErrors.push(err189);
}
errors++;
}
}
if(data.labelDefinitions !== undefined){
let data70 = data.labelDefinitions;
if(data70 && typeof data70 == "object" && !Array.isArray(data70)){
for(const key27 in data70){
const _errs201 = errors;
const _errs202 = errors;
const _errs203 = errors;
if(!(((key27 === "__proto__") || (key27 === "constructor")) || (key27 === "prototype"))){
const err190 = {};
if(vErrors === null){
vErrors = [err190];
}
else {
vErrors.push(err190);
}
errors++;
}
var valid78 = _errs203 === errors;
if(valid78){
const err191 = {instancePath:instancePath+"/labelDefinitions",schemaPath:"#/properties/labelDefinitions/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key27};
if(vErrors === null){
vErrors = [err191];
}
else {
vErrors.push(err191);
}
errors++;
}
else {
errors = _errs202;
if(vErrors !== null){
if(_errs202){
vErrors.length = _errs202;
}
else {
vErrors = null;
}
}
}
if(typeof key27 === "string"){
if(func1(key27) < 1){
const err192 = {instancePath:instancePath+"/labelDefinitions",schemaPath:"#/properties/labelDefinitions/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key27};
if(vErrors === null){
vErrors = [err192];
}
else {
vErrors.push(err192);
}
errors++;
}
}
var valid77 = _errs201 === errors;
if(!valid77){
const err193 = {instancePath:instancePath+"/labelDefinitions",schemaPath:"#/properties/labelDefinitions/propertyNames",keyword:"propertyNames",params:{propertyName: key27},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err193];
}
else {
vErrors.push(err193);
}
errors++;
}
}
for(const key28 in data70){
let data71 = data70[key28];
if(data71 && typeof data71 == "object" && !Array.isArray(data71)){
if(data71.color === undefined){
const err194 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelDefinitions/additionalProperties/required",keyword:"required",params:{missingProperty: "color"},message:"must have required property '"+"color"+"'"};
if(vErrors === null){
vErrors = [err194];
}
else {
vErrors.push(err194);
}
errors++;
}
if(data71.description === undefined){
const err195 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelDefinitions/additionalProperties/required",keyword:"required",params:{missingProperty: "description"},message:"must have required property '"+"description"+"'"};
if(vErrors === null){
vErrors = [err195];
}
else {
vErrors.push(err195);
}
errors++;
}
for(const key29 in data71){
if(!((key29 === "color") || (key29 === "description"))){
const err196 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelDefinitions/additionalProperties/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key29},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err196];
}
else {
vErrors.push(err196);
}
errors++;
}
}
if(data71.color !== undefined){
let data72 = data71.color;
if(typeof data72 === "string"){
if(!pattern3.test(data72)){
const err197 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1")+"/color",schemaPath:"#/properties/labelDefinitions/additionalProperties/properties/color/pattern",keyword:"pattern",params:{pattern: "^[0-9a-fA-F]{6}$"},message:"must match pattern \""+"^[0-9a-fA-F]{6}$"+"\""};
if(vErrors === null){
vErrors = [err197];
}
else {
vErrors.push(err197);
}
errors++;
}
}
else {
const err198 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1")+"/color",schemaPath:"#/properties/labelDefinitions/additionalProperties/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err198];
}
else {
vErrors.push(err198);
}
errors++;
}
}
if(data71.description !== undefined){
let data73 = data71.description;
if(typeof data73 === "string"){
if(func1(data73) > 100){
const err199 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1")+"/description",schemaPath:"#/properties/labelDefinitions/additionalProperties/properties/description/maxLength",keyword:"maxLength",params:{limit: 100},message:"must NOT have more than 100 characters"};
if(vErrors === null){
vErrors = [err199];
}
else {
vErrors.push(err199);
}
errors++;
}
}
else {
const err200 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1")+"/description",schemaPath:"#/properties/labelDefinitions/additionalProperties/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err200];
}
else {
vErrors.push(err200);
}
errors++;
}
}
}
else {
const err201 = {instancePath:instancePath+"/labelDefinitions/" + key28.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/labelDefinitions/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err201];
}
else {
vErrors.push(err201);
}
errors++;
}
}
}
else {
const err202 = {instancePath:instancePath+"/labelDefinitions",schemaPath:"#/properties/labelDefinitions/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err202];
}
else {
vErrors.push(err202);
}
errors++;
}
}
if(data.rules !== undefined){
let data74 = data.rules;
if(data74 && typeof data74 == "object" && !Array.isArray(data74)){
for(const key30 in data74){
const _errs214 = errors;
const _errs215 = errors;
const _errs216 = errors;
if(!(((key30 === "__proto__") || (key30 === "constructor")) || (key30 === "prototype"))){
const err203 = {};
if(vErrors === null){
vErrors = [err203];
}
else {
vErrors.push(err203);
}
errors++;
}
var valid82 = _errs216 === errors;
if(valid82){
const err204 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key30};
if(vErrors === null){
vErrors = [err204];
}
else {
vErrors.push(err204);
}
errors++;
}
else {
errors = _errs215;
if(vErrors !== null){
if(_errs215){
vErrors.length = _errs215;
}
else {
vErrors = null;
}
}
}
if(typeof key30 === "string"){
if(func1(key30) < 1){
const err205 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key30};
if(vErrors === null){
vErrors = [err205];
}
else {
vErrors.push(err205);
}
errors++;
}
}
var valid81 = _errs214 === errors;
if(!valid81){
const err206 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames",keyword:"propertyNames",params:{propertyName: key30},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err206];
}
else {
vErrors.push(err206);
}
errors++;
}
}
for(const key31 in data74){
let data75 = data74[key31];
const _errs219 = errors;
let valid84 = false;
let passing3 = null;
const _errs220 = errors;
if(data75 && typeof data75 == "object" && !Array.isArray(data75)){
if(data75.when === undefined){
const err207 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/0/required",keyword:"required",params:{missingProperty: "when"},message:"must have required property '"+"when"+"'"};
if(vErrors === null){
vErrors = [err207];
}
else {
vErrors.push(err207);
}
errors++;
}
for(const key32 in data75){
if(!(((key32 === "when") || (key32 === "onUnknown")) || (key32 === "effects"))){
const err208 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key32},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err208];
}
else {
vErrors.push(err208);
}
errors++;
}
}
if(data75.when !== undefined){
let data76 = data75.when;
if(typeof data76 === "string"){
if(func1(data76) < 1){
const err209 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/when",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/when/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err209];
}
else {
vErrors.push(err209);
}
errors++;
}
}
else {
const err210 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/when",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/when/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err210];
}
else {
vErrors.push(err210);
}
errors++;
}
}
if(data75.onUnknown !== undefined){
let data77 = data75.onUnknown;
if(!((data77 === "hold") || (data77 === "fail"))){
const err211 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/onUnknown",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/onUnknown/enum",keyword:"enum",params:{allowedValues: schema27.properties.rules.additionalProperties.oneOf[0].properties.onUnknown.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err211];
}
else {
vErrors.push(err211);
}
errors++;
}
}
if(data75.effects !== undefined){
let data78 = data75.effects;
if(data78 && typeof data78 == "object" && !Array.isArray(data78)){
for(const key33 in data78){
if(!((key33 === "labels") || (key33 === "comment"))){
const err212 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key33},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err212];
}
else {
vErrors.push(err212);
}
errors++;
}
}
if(data78.labels !== undefined){
let data79 = data78.labels;
if(data79 && typeof data79 == "object" && !Array.isArray(data79)){
if(data79.add === undefined){
const err213 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/required",keyword:"required",params:{missingProperty: "add"},message:"must have required property '"+"add"+"'"};
if(vErrors === null){
vErrors = [err213];
}
else {
vErrors.push(err213);
}
errors++;
}
for(const key34 in data79){
if(!((key34 === "add") || (key34 === "removeWhenFalse"))){
const err214 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key34},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err214];
}
else {
vErrors.push(err214);
}
errors++;
}
}
if(data79.add !== undefined){
let data80 = data79.add;
if(Array.isArray(data80)){
if(data80.length < 1){
const err215 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/add",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err215];
}
else {
vErrors.push(err215);
}
errors++;
}
const len9 = data80.length;
for(let i17=0; i17<len9; i17++){
let data81 = data80[i17];
if(typeof data81 === "string"){
if(func1(data81) < 1){
const err216 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/add/" + i17,schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add/items/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err216];
}
else {
vErrors.push(err216);
}
errors++;
}
}
else {
const err217 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/add/" + i17,schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err217];
}
else {
vErrors.push(err217);
}
errors++;
}
}
let i18 = data80.length;
let j8;
if(i18 > 1){
const indices7 = {};
for(;i18--;){
let item7 = data80[i18];
if(typeof item7 !== "string"){
continue;
}
if(typeof indices7[item7] == "number"){
j8 = indices7[item7];
const err218 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/add",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add/uniqueItems",keyword:"uniqueItems",params:{i: i18, j: j8},message:"must NOT have duplicate items (items ## "+j8+" and "+i18+" are identical)"};
if(vErrors === null){
vErrors = [err218];
}
else {
vErrors.push(err218);
}
errors++;
break;
}
indices7[item7] = i18;
}
}
}
else {
const err219 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/add",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err219];
}
else {
vErrors.push(err219);
}
errors++;
}
}
if(data79.removeWhenFalse !== undefined){
if(typeof data79.removeWhenFalse !== "boolean"){
const err220 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/removeWhenFalse",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/removeWhenFalse/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err220];
}
else {
vErrors.push(err220);
}
errors++;
}
}
}
else {
const err221 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err221];
}
else {
vErrors.push(err221);
}
errors++;
}
}
if(data78.comment !== undefined){
let data83 = data78.comment;
const _errs240 = errors;
let valid91 = false;
let passing4 = null;
const _errs241 = errors;
const _errs242 = errors;
const _errs243 = errors;
if(data83 && typeof data83 == "object" && !Array.isArray(data83)){
let missing6;
if((data83.templateFile === undefined) && (missing6 = "templateFile")){
const err222 = {};
if(vErrors === null){
vErrors = [err222];
}
else {
vErrors.push(err222);
}
errors++;
}
}
var valid92 = _errs243 === errors;
if(valid92){
const err223 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err223];
}
else {
vErrors.push(err223);
}
errors++;
}
else {
errors = _errs242;
if(vErrors !== null){
if(_errs242){
vErrors.length = _errs242;
}
else {
vErrors = null;
}
}
}
if(data83 && typeof data83 == "object" && !Array.isArray(data83)){
if(data83.template === undefined){
const err224 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/0/required",keyword:"required",params:{missingProperty: "template"},message:"must have required property '"+"template"+"'"};
if(vErrors === null){
vErrors = [err224];
}
else {
vErrors.push(err224);
}
errors++;
}
}
var _valid8 = _errs241 === errors;
if(_valid8){
valid91 = true;
passing4 = 0;
}
const _errs244 = errors;
const _errs245 = errors;
const _errs246 = errors;
if(data83 && typeof data83 == "object" && !Array.isArray(data83)){
let missing7;
if((data83.template === undefined) && (missing7 = "template")){
const err225 = {};
if(vErrors === null){
vErrors = [err225];
}
else {
vErrors.push(err225);
}
errors++;
}
}
var valid93 = _errs246 === errors;
if(valid93){
const err226 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err226];
}
else {
vErrors.push(err226);
}
errors++;
}
else {
errors = _errs245;
if(vErrors !== null){
if(_errs245){
vErrors.length = _errs245;
}
else {
vErrors = null;
}
}
}
if(data83 && typeof data83 == "object" && !Array.isArray(data83)){
if(data83.templateFile === undefined){
const err227 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/1/required",keyword:"required",params:{missingProperty: "templateFile"},message:"must have required property '"+"templateFile"+"'"};
if(vErrors === null){
vErrors = [err227];
}
else {
vErrors.push(err227);
}
errors++;
}
}
var _valid8 = _errs244 === errors;
if(_valid8 && valid91){
valid91 = false;
passing4 = [passing4, 1];
}
else {
if(_valid8){
valid91 = true;
passing4 = 1;
}
}
if(!valid91){
const err228 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf",keyword:"oneOf",params:{passingSchemas: passing4},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err228];
}
else {
vErrors.push(err228);
}
errors++;
}
else {
errors = _errs240;
if(vErrors !== null){
if(_errs240){
vErrors.length = _errs240;
}
else {
vErrors = null;
}
}
}
if(data83 && typeof data83 == "object" && !Array.isArray(data83)){
if(data83.mode === undefined){
const err229 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/required",keyword:"required",params:{missingProperty: "mode"},message:"must have required property '"+"mode"+"'"};
if(vErrors === null){
vErrors = [err229];
}
else {
vErrors.push(err229);
}
errors++;
}
for(const key35 in data83){
if(!((((key35 === "mode") || (key35 === "trigger")) || (key35 === "template")) || (key35 === "templateFile"))){
const err230 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key35},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err230];
}
else {
vErrors.push(err230);
}
errors++;
}
}
if(data83.mode !== undefined){
let data84 = data83.mode;
if(!((((data84 === "create") || (data84 === "once")) || (data84 === "upsert")) || (data84 === "once-per-transition"))){
const err231 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/mode",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/mode/enum",keyword:"enum",params:{allowedValues: schema27.properties.rules.additionalProperties.oneOf[0].properties.effects.properties.comment.properties.mode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err231];
}
else {
vErrors.push(err231);
}
errors++;
}
}
if(data83.trigger !== undefined){
let data85 = data83.trigger;
if(!(((data85 === "always") || (data85 === "matched")) || (data85 === "band-changed"))){
const err232 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/trigger",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/trigger/enum",keyword:"enum",params:{allowedValues: schema27.properties.rules.additionalProperties.oneOf[0].properties.effects.properties.comment.properties.trigger.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err232];
}
else {
vErrors.push(err232);
}
errors++;
}
}
if(data83.template !== undefined){
if(typeof data83.template !== "string"){
const err233 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/template",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/template/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err233];
}
else {
vErrors.push(err233);
}
errors++;
}
}
if(data83.templateFile !== undefined){
let data87 = data83.templateFile;
if(typeof data87 === "string"){
if(func1(data87) < 1){
const err234 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/templateFile",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/templateFile/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err234];
}
else {
vErrors.push(err234);
}
errors++;
}
}
else {
const err235 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/templateFile",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/templateFile/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err235];
}
else {
vErrors.push(err235);
}
errors++;
}
}
}
else {
const err236 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err236];
}
else {
vErrors.push(err236);
}
errors++;
}
}
}
else {
const err237 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects",schemaPath:"#/properties/rules/additionalProperties/oneOf/0/properties/effects/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err237];
}
else {
vErrors.push(err237);
}
errors++;
}
}
}
else {
const err238 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err238];
}
else {
vErrors.push(err238);
}
errors++;
}
var _valid7 = _errs220 === errors;
if(_valid7){
valid84 = true;
passing3 = 0;
var props6 = true;
}
const _errs254 = errors;
if(data75 && typeof data75 == "object" && !Array.isArray(data75)){
if(data75.band === undefined){
const err239 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/1/required",keyword:"required",params:{missingProperty: "band"},message:"must have required property '"+"band"+"'"};
if(vErrors === null){
vErrors = [err239];
}
else {
vErrors.push(err239);
}
errors++;
}
for(const key36 in data75){
if(!(((key36 === "band") || (key36 === "onUnknown")) || (key36 === "effects"))){
const err240 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key36},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err240];
}
else {
vErrors.push(err240);
}
errors++;
}
}
if(data75.band !== undefined){
let data88 = data75.band;
if(typeof data88 === "string"){
if(func1(data88) < 1){
const err241 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/band/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err241];
}
else {
vErrors.push(err241);
}
errors++;
}
}
else {
const err242 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/band/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err242];
}
else {
vErrors.push(err242);
}
errors++;
}
}
if(data75.onUnknown !== undefined){
let data89 = data75.onUnknown;
if(!((data89 === "hold") || (data89 === "fail"))){
const err243 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/onUnknown",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/onUnknown/enum",keyword:"enum",params:{allowedValues: schema27.properties.rules.additionalProperties.oneOf[1].properties.onUnknown.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err243];
}
else {
vErrors.push(err243);
}
errors++;
}
}
if(data75.effects !== undefined){
let data90 = data75.effects;
if(data90 && typeof data90 == "object" && !Array.isArray(data90)){
for(const key37 in data90){
if(!((key37 === "labels") || (key37 === "comment"))){
const err244 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key37},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err244];
}
else {
vErrors.push(err244);
}
errors++;
}
}
if(data90.labels !== undefined){
let data91 = data90.labels;
if(data91 && typeof data91 == "object" && !Array.isArray(data91)){
if(data91.group === undefined){
const err245 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/required",keyword:"required",params:{missingProperty: "group"},message:"must have required property '"+"group"+"'"};
if(vErrors === null){
vErrors = [err245];
}
else {
vErrors.push(err245);
}
errors++;
}
if(data91.byBand === undefined){
const err246 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/required",keyword:"required",params:{missingProperty: "byBand"},message:"must have required property '"+"byBand"+"'"};
if(vErrors === null){
vErrors = [err246];
}
else {
vErrors.push(err246);
}
errors++;
}
for(const key38 in data91){
if(!(((key38 === "group") || (key38 === "byBand")) || (key38 === "unknown"))){
const err247 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key38},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err247];
}
else {
vErrors.push(err247);
}
errors++;
}
}
if(data91.group !== undefined){
let data92 = data91.group;
if(typeof data92 === "string"){
if(func1(data92) < 1){
const err248 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/group",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/group/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err248];
}
else {
vErrors.push(err248);
}
errors++;
}
}
else {
const err249 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/group",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/group/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err249];
}
else {
vErrors.push(err249);
}
errors++;
}
}
if(data91.byBand !== undefined){
let data93 = data91.byBand;
if(data93 && typeof data93 == "object" && !Array.isArray(data93)){
for(const key39 in data93){
const _errs270 = errors;
const _errs271 = errors;
const _errs272 = errors;
if(!(((key39 === "__proto__") || (key39 === "constructor")) || (key39 === "prototype"))){
const err250 = {};
if(vErrors === null){
vErrors = [err250];
}
else {
vErrors.push(err250);
}
errors++;
}
var valid99 = _errs272 === errors;
if(valid99){
const err251 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/byBand",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key39};
if(vErrors === null){
vErrors = [err251];
}
else {
vErrors.push(err251);
}
errors++;
}
else {
errors = _errs271;
if(vErrors !== null){
if(_errs271){
vErrors.length = _errs271;
}
else {
vErrors = null;
}
}
}
if(typeof key39 === "string"){
if(func1(key39) < 1){
const err252 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/byBand",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key39};
if(vErrors === null){
vErrors = [err252];
}
else {
vErrors.push(err252);
}
errors++;
}
}
var valid98 = _errs270 === errors;
if(!valid98){
const err253 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/byBand",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/propertyNames",keyword:"propertyNames",params:{propertyName: key39},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err253];
}
else {
vErrors.push(err253);
}
errors++;
}
}
for(const key40 in data93){
let data94 = data93[key40];
if(typeof data94 === "string"){
if(func1(data94) < 1){
const err254 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/byBand/" + key40.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/additionalProperties/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err254];
}
else {
vErrors.push(err254);
}
errors++;
}
}
else {
const err255 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/byBand/" + key40.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/additionalProperties/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err255];
}
else {
vErrors.push(err255);
}
errors++;
}
}
}
else {
const err256 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/byBand",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err256];
}
else {
vErrors.push(err256);
}
errors++;
}
}
if(data91.unknown !== undefined){
let data95 = data91.unknown;
if(typeof data95 === "string"){
if(func1(data95) < 1){
const err257 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/unknown",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/unknown/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err257];
}
else {
vErrors.push(err257);
}
errors++;
}
}
else {
const err258 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels/unknown",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/unknown/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err258];
}
else {
vErrors.push(err258);
}
errors++;
}
}
}
else {
const err259 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/labels",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err259];
}
else {
vErrors.push(err259);
}
errors++;
}
}
if(data90.comment !== undefined){
let data96 = data90.comment;
const _errs280 = errors;
let valid101 = false;
let passing5 = null;
const _errs281 = errors;
const _errs282 = errors;
const _errs283 = errors;
if(data96 && typeof data96 == "object" && !Array.isArray(data96)){
let missing8;
if((data96.templateFile === undefined) && (missing8 = "templateFile")){
const err260 = {};
if(vErrors === null){
vErrors = [err260];
}
else {
vErrors.push(err260);
}
errors++;
}
}
var valid102 = _errs283 === errors;
if(valid102){
const err261 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err261];
}
else {
vErrors.push(err261);
}
errors++;
}
else {
errors = _errs282;
if(vErrors !== null){
if(_errs282){
vErrors.length = _errs282;
}
else {
vErrors = null;
}
}
}
if(data96 && typeof data96 == "object" && !Array.isArray(data96)){
if(data96.template === undefined){
const err262 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/0/required",keyword:"required",params:{missingProperty: "template"},message:"must have required property '"+"template"+"'"};
if(vErrors === null){
vErrors = [err262];
}
else {
vErrors.push(err262);
}
errors++;
}
}
var _valid9 = _errs281 === errors;
if(_valid9){
valid101 = true;
passing5 = 0;
}
const _errs284 = errors;
const _errs285 = errors;
const _errs286 = errors;
if(data96 && typeof data96 == "object" && !Array.isArray(data96)){
let missing9;
if((data96.template === undefined) && (missing9 = "template")){
const err263 = {};
if(vErrors === null){
vErrors = [err263];
}
else {
vErrors.push(err263);
}
errors++;
}
}
var valid103 = _errs286 === errors;
if(valid103){
const err264 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err264];
}
else {
vErrors.push(err264);
}
errors++;
}
else {
errors = _errs285;
if(vErrors !== null){
if(_errs285){
vErrors.length = _errs285;
}
else {
vErrors = null;
}
}
}
if(data96 && typeof data96 == "object" && !Array.isArray(data96)){
if(data96.templateFile === undefined){
const err265 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/1/required",keyword:"required",params:{missingProperty: "templateFile"},message:"must have required property '"+"templateFile"+"'"};
if(vErrors === null){
vErrors = [err265];
}
else {
vErrors.push(err265);
}
errors++;
}
}
var _valid9 = _errs284 === errors;
if(_valid9 && valid101){
valid101 = false;
passing5 = [passing5, 1];
}
else {
if(_valid9){
valid101 = true;
passing5 = 1;
}
}
if(!valid101){
const err266 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf",keyword:"oneOf",params:{passingSchemas: passing5},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err266];
}
else {
vErrors.push(err266);
}
errors++;
}
else {
errors = _errs280;
if(vErrors !== null){
if(_errs280){
vErrors.length = _errs280;
}
else {
vErrors = null;
}
}
}
if(data96 && typeof data96 == "object" && !Array.isArray(data96)){
if(data96.mode === undefined){
const err267 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/required",keyword:"required",params:{missingProperty: "mode"},message:"must have required property '"+"mode"+"'"};
if(vErrors === null){
vErrors = [err267];
}
else {
vErrors.push(err267);
}
errors++;
}
for(const key41 in data96){
if(!((((key41 === "mode") || (key41 === "trigger")) || (key41 === "template")) || (key41 === "templateFile"))){
const err268 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key41},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err268];
}
else {
vErrors.push(err268);
}
errors++;
}
}
if(data96.mode !== undefined){
let data97 = data96.mode;
if(!((((data97 === "create") || (data97 === "once")) || (data97 === "upsert")) || (data97 === "once-per-transition"))){
const err269 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/mode",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/mode/enum",keyword:"enum",params:{allowedValues: schema27.properties.rules.additionalProperties.oneOf[1].properties.effects.properties.comment.properties.mode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err269];
}
else {
vErrors.push(err269);
}
errors++;
}
}
if(data96.trigger !== undefined){
let data98 = data96.trigger;
if(!(((data98 === "always") || (data98 === "matched")) || (data98 === "band-changed"))){
const err270 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/trigger",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/trigger/enum",keyword:"enum",params:{allowedValues: schema27.properties.rules.additionalProperties.oneOf[1].properties.effects.properties.comment.properties.trigger.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err270];
}
else {
vErrors.push(err270);
}
errors++;
}
}
if(data96.template !== undefined){
if(typeof data96.template !== "string"){
const err271 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/template",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/template/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err271];
}
else {
vErrors.push(err271);
}
errors++;
}
}
if(data96.templateFile !== undefined){
let data100 = data96.templateFile;
if(typeof data100 === "string"){
if(func1(data100) < 1){
const err272 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/templateFile",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/templateFile/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err272];
}
else {
vErrors.push(err272);
}
errors++;
}
}
else {
const err273 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment/templateFile",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/templateFile/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err273];
}
else {
vErrors.push(err273);
}
errors++;
}
}
}
else {
const err274 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects/comment",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err274];
}
else {
vErrors.push(err274);
}
errors++;
}
}
}
else {
const err275 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1")+"/effects",schemaPath:"#/properties/rules/additionalProperties/oneOf/1/properties/effects/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err275];
}
else {
vErrors.push(err275);
}
errors++;
}
}
}
else {
const err276 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err276];
}
else {
vErrors.push(err276);
}
errors++;
}
var _valid7 = _errs254 === errors;
if(_valid7 && valid84){
valid84 = false;
passing3 = [passing3, 1];
}
else {
if(_valid7){
valid84 = true;
passing3 = 1;
if(props6 !== true){
props6 = true;
}
}
}
if(!valid84){
const err277 = {instancePath:instancePath+"/rules/" + key31.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/oneOf",keyword:"oneOf",params:{passingSchemas: passing3},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err277];
}
else {
vErrors.push(err277);
}
errors++;
}
else {
errors = _errs219;
if(vErrors !== null){
if(_errs219){
vErrors.length = _errs219;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err278 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err278];
}
else {
vErrors.push(err278);
}
errors++;
}
}
}
else {
const err279 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err279];
}
else {
vErrors.push(err279);
}
errors++;
}
validate82.errors = vErrors;
return errors === 0;
}
validate82.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

exports.report = validate83;
const schema28 = {"type":"object","properties":{"kind":{"const":"diffdevil.report"},"schemaVersion":{"const":"1.0"},"semantics":{"type":"object","properties":{"language":{"const":"diffdevil-expr/1"},"numbers":{"const":"diffdevil-number/1"},"replacementLines":{"const":"replacement-lines-v1"},"paths":{"const":"diffdevil-glob/1"},"presets":{"type":"array","items":{"type":"string"}},"limits":{"type":"string"}},"additionalProperties":true,"required":["language","numbers","replacementLines","paths"]},"source":{"type":"object","properties":{"kind":{"enum":["git","unified-diff","github-api"]},"comparisonId":{"type":"string","minLength":1},"base":{"type":"string"},"head":{"type":"string"},"comparison":{"enum":["three-dot","direct","worktree","staged","supplied"]},"repository":{"type":"string"},"pullRequest":{"type":"integer","minimum":0,"maximum":9007199254740991},"baseTip":{"type":"string","description":"Current pull-request base tip when a Git three-dot diff begins at an older merge base."}},"additionalProperties":true,"required":["kind","comparisonId"]},"measurement":{"type":"object","properties":{"status":{"enum":["exact","bounded","unknown","unmeasurable"]},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]}}},"additionalProperties":true,"required":["status","reasons"]},"fileSet":{"type":"object","properties":{"complete":{"type":"boolean"},"total":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["complete","total"]},"totals":{"type":"object","properties":{"raw":{"type":"object","properties":{"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"churn":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["added","deleted","churn"]},"lines":{"type":"object","properties":{"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"modified":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"changed":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["added","deleted","modified","changed"]},"files":{"type":"object","properties":{"total":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"included":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"excluded":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"modified":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"renamed":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"copied":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"binary":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"unmeasurable":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["total","included","excluded","added","deleted","modified","renamed","copied","binary","unmeasurable"]}},"additionalProperties":true,"required":["raw","lines","files"]},"files":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","minLength":1},"path":{"type":"string","minLength":1},"oldPath":{"type":"string"},"changeType":{"enum":["added","deleted","modified","renamed","copied","type-changed","unmerged"]},"kind":{"enum":["text","binary","submodule","unknown"]},"included":{"type":"boolean"},"raw":{"type":"object","properties":{"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"churn":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["added","deleted","churn"]},"lines":{"type":"object","properties":{"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"modified":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"changed":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["added","deleted","modified","changed"]},"measurement":{"type":"object","properties":{"status":{"enum":["exact","bounded","unknown","unmeasurable"]},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]}}},"additionalProperties":true,"required":["status","reasons"]},"inclusionReasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]}},"family":{"type":"object","properties":{"id":{"type":"string","minLength":1},"rawCountsExact":{"type":"boolean"},"blocksComplete":{"type":"boolean"}},"additionalProperties":true,"required":["id","rawCountsExact","blocksComplete"]}},"additionalProperties":true,"required":["id","path","changeType","kind","included","raw","lines","measurement"]}},"metrics":{"type":"object","additionalProperties":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"bands":{"type":"object","additionalProperties":{"oneOf":[{"type":"object","properties":{"status":{"const":"resolved"},"id":{"type":"string","minLength":1},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","id"]},{"type":"object","properties":{"status":{"const":"unknown"},"candidates":{"type":"array","items":{"type":"string"}},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","candidates","reasons"],"not":{"required":["id"]}}]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"rules":{"type":"object","additionalProperties":{"type":"object","properties":{"decision":{"$ref":"urn:diffdevil:values:1#/$defs/decision"},"band":{"oneOf":[{"type":"object","properties":{"status":{"const":"resolved"},"id":{"type":"string","minLength":1},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","id"]},{"type":"object","properties":{"status":{"const":"unknown"},"candidates":{"type":"array","items":{"type":"string"}},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","candidates","reasons"],"not":{"required":["id"]}}]},"disposition":{"enum":["matched","unmatched","held","fallback"]}},"additionalProperties":true,"required":["disposition"]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"scopes":{"type":"object","additionalProperties":{"type":"object","properties":{"fileIds":{"type":"array","items":{"type":"string"},"uniqueItems":true},"fileSet":{"type":"object","properties":{"complete":{"type":"boolean"},"total":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["complete","total"]},"totals":{"type":"object","properties":{"raw":{"type":"object","properties":{"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"churn":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["added","deleted","churn"]},"lines":{"type":"object","properties":{"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"modified":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"changed":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["added","deleted","modified","changed"]},"files":{"type":"object","properties":{"included":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"added":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"deleted":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"modified":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"renamed":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"copied":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"binary":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"},"unmeasurable":{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}},"additionalProperties":true,"required":["included","added","deleted","modified","renamed","copied","binary","unmeasurable"]}},"additionalProperties":true,"required":["raw","lines","files"]}},"additionalProperties":true,"required":["fileIds","fileSet","totals"]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"policyId":{"type":"string"},"reportId":{"type":"string"},"producer":{"type":"object","properties":{"name":{"type":"string"},"version":{"type":"string"}},"additionalProperties":true,"required":[]},"metricTypes":{"type":"object","additionalProperties":{"enum":["integer","float"]}}},"additionalProperties":true,"required":["kind","schemaVersion","semantics","source","measurement","fileSet","totals","files"],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:diffdevil:report:1","title":"diffdevil full report 1.0","description":"Reader accepts additive fields; executable reader must additionally validate supported semantics, integer counts, paths, evidence identities, completeness, and references.","dependentRequired":{"metrics":["metricTypes"],"metricTypes":["metrics"]}};

function validate84(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate84.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs4 = errors;
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.lower === undefined) && (missing0 = "lower")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
var valid2 = _errs5 === errors;
if(valid2){
const err1 = {instancePath,schemaPath:"#/oneOf/0/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
errors = _errs4;
if(vErrors !== null){
if(_errs4){
vErrors.length = _errs4;
}
else {
vErrors = null;
}
}
}
const _errs7 = errors;
const _errs8 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.upper === undefined) && (missing1 = "upper")){
const err2 = {};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var valid3 = _errs8 === errors;
if(valid3){
const err3 = {instancePath,schemaPath:"#/oneOf/0/allOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
errors = _errs7;
if(vErrors !== null){
if(_errs7){
vErrors.length = _errs7;
}
else {
vErrors = null;
}
}
}
const _errs10 = errors;
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.reasons === undefined) && (missing2 = "reasons")){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
var valid4 = _errs11 === errors;
if(valid4){
const err5 = {instancePath,schemaPath:"#/oneOf/0/allOf/2/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
else {
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err6 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.value === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.status !== undefined){
if("exact" !== data.status){
const err8 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "exact"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.value !== undefined){
let data1 = data.value;
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 1.7976931348623157e+308 || isNaN(data1)){
const err9 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data1 < -1.7976931348623157e+308 || isNaN(data1)){
const err10 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
}
else {
const err12 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs16 = errors;
const _errs19 = errors;
const _errs20 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.value === undefined) && (missing3 = "value")){
const err13 = {};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
var valid7 = _errs20 === errors;
if(valid7){
const err14 = {instancePath,schemaPath:"#/oneOf/1/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
else {
errors = _errs19;
if(vErrors !== null){
if(_errs19){
vErrors.length = _errs19;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err15 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data.lower === undefined){
const err16 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "lower"},message:"must have required property '"+"lower"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data.upper === undefined){
const err17 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "upper"},message:"must have required property '"+"upper"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data.status !== undefined){
if("bounded" !== data.status){
const err18 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "bounded"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.lower !== undefined){
let data3 = data.lower;
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 1.7976931348623157e+308 || isNaN(data3)){
const err19 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/1/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data3 < -1.7976931348623157e+308 || isNaN(data3)){
const err20 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/1/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
else {
const err21 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/1/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.upper !== undefined){
let data4 = data.upper;
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 1.7976931348623157e+308 || isNaN(data4)){
const err22 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/1/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data4 < -1.7976931348623157e+308 || isNaN(data4)){
const err23 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/1/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
else {
const err24 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/1/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid0 = _errs16 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs27 = errors;
const _errs30 = errors;
const _errs31 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if((data.value === undefined) && (missing4 = "value")){
const err26 = {};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
var valid10 = _errs31 === errors;
if(valid10){
const err27 = {instancePath,schemaPath:"#/oneOf/2/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
else {
errors = _errs30;
if(vErrors !== null){
if(_errs30){
vErrors.length = _errs30;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err28 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data.reasons === undefined){
const err29 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data.status !== undefined){
if("unknown" !== data.status){
const err30 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/2/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.lower !== undefined){
let data6 = data.lower;
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 1.7976931348623157e+308 || isNaN(data6)){
const err31 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/2/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data6 < -1.7976931348623157e+308 || isNaN(data6)){
const err32 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/2/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
else {
const err33 = {instancePath:instancePath+"/lower",schemaPath:"#/oneOf/2/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data.upper !== undefined){
let data7 = data.upper;
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 1.7976931348623157e+308 || isNaN(data7)){
const err34 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/2/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data7 < -1.7976931348623157e+308 || isNaN(data7)){
const err35 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/2/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
else {
const err36 = {instancePath:instancePath+"/upper",schemaPath:"#/oneOf/2/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data.reasons !== undefined){
let data8 = data.reasons;
if(Array.isArray(data8)){
if(data8.length < 1){
const err37 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/2/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
const len0 = data8.length;
for(let i0=0; i0<len0; i0++){
let data9 = data8[i0];
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.code === undefined){
const err38 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/2/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data9.code !== undefined){
let data10 = data9.code;
if(typeof data10 === "string"){
if(func1(data10) < 1){
const err39 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/2/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
else {
const err40 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/2/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data9.subject !== undefined){
if(typeof data9.subject !== "string"){
const err41 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/2/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data9.message !== undefined){
if(typeof data9.message !== "string"){
const err42 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/2/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
else {
const err43 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/2/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/2/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
}
else {
const err45 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
var _valid0 = _errs27 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs49 = errors;
const _errs52 = errors;
const _errs53 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing5;
if((data.value === undefined) && (missing5 = "value")){
const err46 = {};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
var valid16 = _errs53 === errors;
if(valid16){
const err47 = {instancePath,schemaPath:"#/oneOf/3/allOf/0/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
else {
errors = _errs52;
if(vErrors !== null){
if(_errs52){
vErrors.length = _errs52;
}
else {
vErrors = null;
}
}
}
const _errs55 = errors;
const _errs56 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing6;
if((data.lower === undefined) && (missing6 = "lower")){
const err48 = {};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
var valid17 = _errs56 === errors;
if(valid17){
const err49 = {instancePath,schemaPath:"#/oneOf/3/allOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
else {
errors = _errs55;
if(vErrors !== null){
if(_errs55){
vErrors.length = _errs55;
}
else {
vErrors = null;
}
}
}
const _errs58 = errors;
const _errs59 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing7;
if((data.upper === undefined) && (missing7 = "upper")){
const err50 = {};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
var valid18 = _errs59 === errors;
if(valid18){
const err51 = {instancePath,schemaPath:"#/oneOf/3/allOf/2/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
else {
errors = _errs58;
if(vErrors !== null){
if(_errs58){
vErrors.length = _errs58;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err52 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data.reasons === undefined){
const err53 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data.status !== undefined){
if("unmeasurable" !== data.status){
const err54 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/3/properties/status/const",keyword:"const",params:{allowedValue: "unmeasurable"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data.reasons !== undefined){
let data14 = data.reasons;
if(Array.isArray(data14)){
if(data14.length < 1){
const err55 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/3/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
const len1 = data14.length;
for(let i1=0; i1<len1; i1++){
let data15 = data14[i1];
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.code === undefined){
const err56 = {instancePath:instancePath+"/reasons/" + i1,schemaPath:"#/oneOf/3/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data15.code !== undefined){
let data16 = data15.code;
if(typeof data16 === "string"){
if(func1(data16) < 1){
const err57 = {instancePath:instancePath+"/reasons/" + i1+"/code",schemaPath:"#/oneOf/3/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
else {
const err58 = {instancePath:instancePath+"/reasons/" + i1+"/code",schemaPath:"#/oneOf/3/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data15.subject !== undefined){
if(typeof data15.subject !== "string"){
const err59 = {instancePath:instancePath+"/reasons/" + i1+"/subject",schemaPath:"#/oneOf/3/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data15.message !== undefined){
if(typeof data15.message !== "string"){
const err60 = {instancePath:instancePath+"/reasons/" + i1+"/message",schemaPath:"#/oneOf/3/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/reasons/" + i1,schemaPath:"#/oneOf/3/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
}
else {
const err62 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/3/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
}
else {
const err63 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
var _valid0 = _errs49 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
}
}
}
if(!valid0){
const err64 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate84.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate84.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate111(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate111.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.value === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.status !== undefined){
if("resolved" !== data.status){
const err2 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "resolved"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.value !== undefined){
if(typeof data.value !== "boolean"){
const err3 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs7 = errors;
const _errs9 = errors;
const _errs10 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.value === undefined) && (missing0 = "value")){
const err5 = {};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
var valid2 = _errs10 === errors;
if(valid2){
const err6 = {instancePath,schemaPath:"#/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.reasons === undefined){
const err8 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.status !== undefined){
if("unknown" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.reasons !== undefined){
let data3 = data.reasons;
if(Array.isArray(data3)){
if(data3.length < 1){
const err10 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/1/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.code === undefined){
const err11 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/1/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data4.code !== undefined){
let data5 = data4.code;
if(typeof data5 === "string"){
if(func1(data5) < 1){
const err12 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/1/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/1/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data4.subject !== undefined){
if(typeof data4.subject !== "string"){
const err14 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/1/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data4.message !== undefined){
if(typeof data4.message !== "string"){
const err15 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/1/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/1/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/1/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err19 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate111.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate111.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate83(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="urn:diffdevil:report:1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate83.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.schemaVersion === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.semantics === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "semantics"},message:"must have required property '"+"semantics"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.source === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.measurement === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "measurement"},message:"must have required property '"+"measurement"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.fileSet === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "fileSet"},message:"must have required property '"+"fileSet"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.totals === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "totals"},message:"must have required property '"+"totals"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.files === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "files"},message:"must have required property '"+"files"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.kind !== undefined){
if("diffdevil.report" !== data.kind){
const err8 = {instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "diffdevil.report"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if("1.0" !== data.schemaVersion){
const err9 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.semantics !== undefined){
let data2 = data.semantics;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.language === undefined){
const err10 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "language"},message:"must have required property '"+"language"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data2.numbers === undefined){
const err11 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "numbers"},message:"must have required property '"+"numbers"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data2.replacementLines === undefined){
const err12 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "replacementLines"},message:"must have required property '"+"replacementLines"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data2.paths === undefined){
const err13 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data2.language !== undefined){
if("diffdevil-expr/1" !== data2.language){
const err14 = {instancePath:instancePath+"/semantics/language",schemaPath:"#/properties/semantics/properties/language/const",keyword:"const",params:{allowedValue: "diffdevil-expr/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data2.numbers !== undefined){
if("diffdevil-number/1" !== data2.numbers){
const err15 = {instancePath:instancePath+"/semantics/numbers",schemaPath:"#/properties/semantics/properties/numbers/const",keyword:"const",params:{allowedValue: "diffdevil-number/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data2.replacementLines !== undefined){
if("replacement-lines-v1" !== data2.replacementLines){
const err16 = {instancePath:instancePath+"/semantics/replacementLines",schemaPath:"#/properties/semantics/properties/replacementLines/const",keyword:"const",params:{allowedValue: "replacement-lines-v1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data2.paths !== undefined){
if("diffdevil-glob/1" !== data2.paths){
const err17 = {instancePath:instancePath+"/semantics/paths",schemaPath:"#/properties/semantics/properties/paths/const",keyword:"const",params:{allowedValue: "diffdevil-glob/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data2.presets !== undefined){
let data7 = data2.presets;
if(Array.isArray(data7)){
const len0 = data7.length;
for(let i0=0; i0<len0; i0++){
if(typeof data7[i0] !== "string"){
const err18 = {instancePath:instancePath+"/semantics/presets/" + i0,schemaPath:"#/properties/semantics/properties/presets/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
else {
const err19 = {instancePath:instancePath+"/semantics/presets",schemaPath:"#/properties/semantics/properties/presets/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data2.limits !== undefined){
if(typeof data2.limits !== "string"){
const err20 = {instancePath:instancePath+"/semantics/limits",schemaPath:"#/properties/semantics/properties/limits/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
}
else {
const err21 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.source !== undefined){
let data10 = data.source;
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.kind === undefined){
const err22 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data10.comparisonId === undefined){
const err23 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "comparisonId"},message:"must have required property '"+"comparisonId"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data10.kind !== undefined){
let data11 = data10.kind;
if(!(((data11 === "git") || (data11 === "unified-diff")) || (data11 === "github-api"))){
const err24 = {instancePath:instancePath+"/source/kind",schemaPath:"#/properties/source/properties/kind/enum",keyword:"enum",params:{allowedValues: schema28.properties.source.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data10.comparisonId !== undefined){
let data12 = data10.comparisonId;
if(typeof data12 === "string"){
if(func1(data12) < 1){
const err25 = {instancePath:instancePath+"/source/comparisonId",schemaPath:"#/properties/source/properties/comparisonId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
else {
const err26 = {instancePath:instancePath+"/source/comparisonId",schemaPath:"#/properties/source/properties/comparisonId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data10.base !== undefined){
if(typeof data10.base !== "string"){
const err27 = {instancePath:instancePath+"/source/base",schemaPath:"#/properties/source/properties/base/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data10.head !== undefined){
if(typeof data10.head !== "string"){
const err28 = {instancePath:instancePath+"/source/head",schemaPath:"#/properties/source/properties/head/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data10.comparison !== undefined){
let data15 = data10.comparison;
if(!(((((data15 === "three-dot") || (data15 === "direct")) || (data15 === "worktree")) || (data15 === "staged")) || (data15 === "supplied"))){
const err29 = {instancePath:instancePath+"/source/comparison",schemaPath:"#/properties/source/properties/comparison/enum",keyword:"enum",params:{allowedValues: schema28.properties.source.properties.comparison.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data10.repository !== undefined){
if(typeof data10.repository !== "string"){
const err30 = {instancePath:instancePath+"/source/repository",schemaPath:"#/properties/source/properties/repository/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data10.pullRequest !== undefined){
let data17 = data10.pullRequest;
if(!(((typeof data17 == "number") && (!(data17 % 1) && !isNaN(data17))) && (isFinite(data17)))){
const err31 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if((typeof data17 == "number") && (isFinite(data17))){
if(data17 > 9007199254740991 || isNaN(data17)){
const err32 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data17 < 0 || isNaN(data17)){
const err33 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
if(data10.baseTip !== undefined){
if(typeof data10.baseTip !== "string"){
const err34 = {instancePath:instancePath+"/source/baseTip",schemaPath:"#/properties/source/properties/baseTip/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
}
else {
const err35 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data.measurement !== undefined){
let data19 = data.measurement;
if(data19 && typeof data19 == "object" && !Array.isArray(data19)){
if(data19.status === undefined){
const err36 = {instancePath:instancePath+"/measurement",schemaPath:"#/properties/measurement/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(data19.reasons === undefined){
const err37 = {instancePath:instancePath+"/measurement",schemaPath:"#/properties/measurement/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data19.status !== undefined){
let data20 = data19.status;
if(!((((data20 === "exact") || (data20 === "bounded")) || (data20 === "unknown")) || (data20 === "unmeasurable"))){
const err38 = {instancePath:instancePath+"/measurement/status",schemaPath:"#/properties/measurement/properties/status/enum",keyword:"enum",params:{allowedValues: schema28.properties.measurement.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data19.reasons !== undefined){
let data21 = data19.reasons;
if(Array.isArray(data21)){
const len1 = data21.length;
for(let i1=0; i1<len1; i1++){
let data22 = data21[i1];
if(data22 && typeof data22 == "object" && !Array.isArray(data22)){
if(data22.code === undefined){
const err39 = {instancePath:instancePath+"/measurement/reasons/" + i1,schemaPath:"#/properties/measurement/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data22.code !== undefined){
let data23 = data22.code;
if(typeof data23 === "string"){
if(func1(data23) < 1){
const err40 = {instancePath:instancePath+"/measurement/reasons/" + i1+"/code",schemaPath:"#/properties/measurement/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
else {
const err41 = {instancePath:instancePath+"/measurement/reasons/" + i1+"/code",schemaPath:"#/properties/measurement/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
if(data22.subject !== undefined){
if(typeof data22.subject !== "string"){
const err42 = {instancePath:instancePath+"/measurement/reasons/" + i1+"/subject",schemaPath:"#/properties/measurement/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data22.message !== undefined){
if(typeof data22.message !== "string"){
const err43 = {instancePath:instancePath+"/measurement/reasons/" + i1+"/message",schemaPath:"#/properties/measurement/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
}
else {
const err44 = {instancePath:instancePath+"/measurement/reasons/" + i1,schemaPath:"#/properties/measurement/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
}
else {
const err45 = {instancePath:instancePath+"/measurement/reasons",schemaPath:"#/properties/measurement/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
}
else {
const err46 = {instancePath:instancePath+"/measurement",schemaPath:"#/properties/measurement/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data.fileSet !== undefined){
let data26 = data.fileSet;
if(data26 && typeof data26 == "object" && !Array.isArray(data26)){
if(data26.complete === undefined){
const err47 = {instancePath:instancePath+"/fileSet",schemaPath:"#/properties/fileSet/required",keyword:"required",params:{missingProperty: "complete"},message:"must have required property '"+"complete"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data26.total === undefined){
const err48 = {instancePath:instancePath+"/fileSet",schemaPath:"#/properties/fileSet/required",keyword:"required",params:{missingProperty: "total"},message:"must have required property '"+"total"+"'"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data26.complete !== undefined){
if(typeof data26.complete !== "boolean"){
const err49 = {instancePath:instancePath+"/fileSet/complete",schemaPath:"#/properties/fileSet/properties/complete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data26.total !== undefined){
if(!(validate84(data26.total, {instancePath:instancePath+"/fileSet/total",parentData:data26,parentDataProperty:"total",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err50 = {instancePath:instancePath+"/fileSet",schemaPath:"#/properties/fileSet/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data.totals !== undefined){
let data29 = data.totals;
if(data29 && typeof data29 == "object" && !Array.isArray(data29)){
if(data29.raw === undefined){
const err51 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/required",keyword:"required",params:{missingProperty: "raw"},message:"must have required property '"+"raw"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data29.lines === undefined){
const err52 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/required",keyword:"required",params:{missingProperty: "lines"},message:"must have required property '"+"lines"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data29.files === undefined){
const err53 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/required",keyword:"required",params:{missingProperty: "files"},message:"must have required property '"+"files"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data29.raw !== undefined){
let data30 = data29.raw;
if(data30 && typeof data30 == "object" && !Array.isArray(data30)){
if(data30.added === undefined){
const err54 = {instancePath:instancePath+"/totals/raw",schemaPath:"#/properties/totals/properties/raw/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data30.deleted === undefined){
const err55 = {instancePath:instancePath+"/totals/raw",schemaPath:"#/properties/totals/properties/raw/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
if(data30.churn === undefined){
const err56 = {instancePath:instancePath+"/totals/raw",schemaPath:"#/properties/totals/properties/raw/required",keyword:"required",params:{missingProperty: "churn"},message:"must have required property '"+"churn"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data30.added !== undefined){
if(!(validate84(data30.added, {instancePath:instancePath+"/totals/raw/added",parentData:data30,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data30.deleted !== undefined){
if(!(validate84(data30.deleted, {instancePath:instancePath+"/totals/raw/deleted",parentData:data30,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data30.churn !== undefined){
if(!(validate84(data30.churn, {instancePath:instancePath+"/totals/raw/churn",parentData:data30,parentDataProperty:"churn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err57 = {instancePath:instancePath+"/totals/raw",schemaPath:"#/properties/totals/properties/raw/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data29.lines !== undefined){
let data34 = data29.lines;
if(data34 && typeof data34 == "object" && !Array.isArray(data34)){
if(data34.added === undefined){
const err58 = {instancePath:instancePath+"/totals/lines",schemaPath:"#/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
if(data34.deleted === undefined){
const err59 = {instancePath:instancePath+"/totals/lines",schemaPath:"#/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
if(data34.modified === undefined){
const err60 = {instancePath:instancePath+"/totals/lines",schemaPath:"#/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "modified"},message:"must have required property '"+"modified"+"'"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(data34.changed === undefined){
const err61 = {instancePath:instancePath+"/totals/lines",schemaPath:"#/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "changed"},message:"must have required property '"+"changed"+"'"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
if(data34.added !== undefined){
if(!(validate84(data34.added, {instancePath:instancePath+"/totals/lines/added",parentData:data34,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data34.deleted !== undefined){
if(!(validate84(data34.deleted, {instancePath:instancePath+"/totals/lines/deleted",parentData:data34,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data34.modified !== undefined){
if(!(validate84(data34.modified, {instancePath:instancePath+"/totals/lines/modified",parentData:data34,parentDataProperty:"modified",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data34.changed !== undefined){
if(!(validate84(data34.changed, {instancePath:instancePath+"/totals/lines/changed",parentData:data34,parentDataProperty:"changed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err62 = {instancePath:instancePath+"/totals/lines",schemaPath:"#/properties/totals/properties/lines/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
if(data29.files !== undefined){
let data39 = data29.files;
if(data39 && typeof data39 == "object" && !Array.isArray(data39)){
if(data39.total === undefined){
const err63 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "total"},message:"must have required property '"+"total"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
if(data39.included === undefined){
const err64 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "included"},message:"must have required property '"+"included"+"'"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
if(data39.excluded === undefined){
const err65 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "excluded"},message:"must have required property '"+"excluded"+"'"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
if(data39.added === undefined){
const err66 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
if(data39.deleted === undefined){
const err67 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(data39.modified === undefined){
const err68 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "modified"},message:"must have required property '"+"modified"+"'"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
if(data39.renamed === undefined){
const err69 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "renamed"},message:"must have required property '"+"renamed"+"'"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
if(data39.copied === undefined){
const err70 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "copied"},message:"must have required property '"+"copied"+"'"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
if(data39.binary === undefined){
const err71 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "binary"},message:"must have required property '"+"binary"+"'"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
if(data39.unmeasurable === undefined){
const err72 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "unmeasurable"},message:"must have required property '"+"unmeasurable"+"'"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
if(data39.total !== undefined){
if(!(validate84(data39.total, {instancePath:instancePath+"/totals/files/total",parentData:data39,parentDataProperty:"total",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.included !== undefined){
if(!(validate84(data39.included, {instancePath:instancePath+"/totals/files/included",parentData:data39,parentDataProperty:"included",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.excluded !== undefined){
if(!(validate84(data39.excluded, {instancePath:instancePath+"/totals/files/excluded",parentData:data39,parentDataProperty:"excluded",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.added !== undefined){
if(!(validate84(data39.added, {instancePath:instancePath+"/totals/files/added",parentData:data39,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.deleted !== undefined){
if(!(validate84(data39.deleted, {instancePath:instancePath+"/totals/files/deleted",parentData:data39,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.modified !== undefined){
if(!(validate84(data39.modified, {instancePath:instancePath+"/totals/files/modified",parentData:data39,parentDataProperty:"modified",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.renamed !== undefined){
if(!(validate84(data39.renamed, {instancePath:instancePath+"/totals/files/renamed",parentData:data39,parentDataProperty:"renamed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.copied !== undefined){
if(!(validate84(data39.copied, {instancePath:instancePath+"/totals/files/copied",parentData:data39,parentDataProperty:"copied",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.binary !== undefined){
if(!(validate84(data39.binary, {instancePath:instancePath+"/totals/files/binary",parentData:data39,parentDataProperty:"binary",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data39.unmeasurable !== undefined){
if(!(validate84(data39.unmeasurable, {instancePath:instancePath+"/totals/files/unmeasurable",parentData:data39,parentDataProperty:"unmeasurable",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err73 = {instancePath:instancePath+"/totals/files",schemaPath:"#/properties/totals/properties/files/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
}
else {
const err74 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
if(data.files !== undefined){
let data50 = data.files;
if(Array.isArray(data50)){
const len2 = data50.length;
for(let i2=0; i2<len2; i2++){
let data51 = data50[i2];
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.id === undefined){
const err75 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
if(data51.path === undefined){
const err76 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
if(data51.changeType === undefined){
const err77 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "changeType"},message:"must have required property '"+"changeType"+"'"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
if(data51.kind === undefined){
const err78 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
if(data51.included === undefined){
const err79 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "included"},message:"must have required property '"+"included"+"'"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
if(data51.raw === undefined){
const err80 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "raw"},message:"must have required property '"+"raw"+"'"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
if(data51.lines === undefined){
const err81 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "lines"},message:"must have required property '"+"lines"+"'"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
if(data51.measurement === undefined){
const err82 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/required",keyword:"required",params:{missingProperty: "measurement"},message:"must have required property '"+"measurement"+"'"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
if(data51.id !== undefined){
let data52 = data51.id;
if(typeof data52 === "string"){
if(func1(data52) < 1){
const err83 = {instancePath:instancePath+"/files/" + i2+"/id",schemaPath:"#/properties/files/items/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
else {
const err84 = {instancePath:instancePath+"/files/" + i2+"/id",schemaPath:"#/properties/files/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
if(data51.path !== undefined){
let data53 = data51.path;
if(typeof data53 === "string"){
if(func1(data53) < 1){
const err85 = {instancePath:instancePath+"/files/" + i2+"/path",schemaPath:"#/properties/files/items/properties/path/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
else {
const err86 = {instancePath:instancePath+"/files/" + i2+"/path",schemaPath:"#/properties/files/items/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
if(data51.oldPath !== undefined){
if(typeof data51.oldPath !== "string"){
const err87 = {instancePath:instancePath+"/files/" + i2+"/oldPath",schemaPath:"#/properties/files/items/properties/oldPath/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
}
if(data51.changeType !== undefined){
let data55 = data51.changeType;
if(!(((((((data55 === "added") || (data55 === "deleted")) || (data55 === "modified")) || (data55 === "renamed")) || (data55 === "copied")) || (data55 === "type-changed")) || (data55 === "unmerged"))){
const err88 = {instancePath:instancePath+"/files/" + i2+"/changeType",schemaPath:"#/properties/files/items/properties/changeType/enum",keyword:"enum",params:{allowedValues: schema28.properties.files.items.properties.changeType.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
if(data51.kind !== undefined){
let data56 = data51.kind;
if(!((((data56 === "text") || (data56 === "binary")) || (data56 === "submodule")) || (data56 === "unknown"))){
const err89 = {instancePath:instancePath+"/files/" + i2+"/kind",schemaPath:"#/properties/files/items/properties/kind/enum",keyword:"enum",params:{allowedValues: schema28.properties.files.items.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
if(data51.included !== undefined){
if(typeof data51.included !== "boolean"){
const err90 = {instancePath:instancePath+"/files/" + i2+"/included",schemaPath:"#/properties/files/items/properties/included/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
if(data51.raw !== undefined){
let data58 = data51.raw;
if(data58 && typeof data58 == "object" && !Array.isArray(data58)){
if(data58.added === undefined){
const err91 = {instancePath:instancePath+"/files/" + i2+"/raw",schemaPath:"#/properties/files/items/properties/raw/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
if(data58.deleted === undefined){
const err92 = {instancePath:instancePath+"/files/" + i2+"/raw",schemaPath:"#/properties/files/items/properties/raw/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if(data58.churn === undefined){
const err93 = {instancePath:instancePath+"/files/" + i2+"/raw",schemaPath:"#/properties/files/items/properties/raw/required",keyword:"required",params:{missingProperty: "churn"},message:"must have required property '"+"churn"+"'"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
if(data58.added !== undefined){
if(!(validate84(data58.added, {instancePath:instancePath+"/files/" + i2+"/raw/added",parentData:data58,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data58.deleted !== undefined){
if(!(validate84(data58.deleted, {instancePath:instancePath+"/files/" + i2+"/raw/deleted",parentData:data58,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data58.churn !== undefined){
if(!(validate84(data58.churn, {instancePath:instancePath+"/files/" + i2+"/raw/churn",parentData:data58,parentDataProperty:"churn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err94 = {instancePath:instancePath+"/files/" + i2+"/raw",schemaPath:"#/properties/files/items/properties/raw/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
if(data51.lines !== undefined){
let data62 = data51.lines;
if(data62 && typeof data62 == "object" && !Array.isArray(data62)){
if(data62.added === undefined){
const err95 = {instancePath:instancePath+"/files/" + i2+"/lines",schemaPath:"#/properties/files/items/properties/lines/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
if(data62.deleted === undefined){
const err96 = {instancePath:instancePath+"/files/" + i2+"/lines",schemaPath:"#/properties/files/items/properties/lines/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
if(data62.modified === undefined){
const err97 = {instancePath:instancePath+"/files/" + i2+"/lines",schemaPath:"#/properties/files/items/properties/lines/required",keyword:"required",params:{missingProperty: "modified"},message:"must have required property '"+"modified"+"'"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
if(data62.changed === undefined){
const err98 = {instancePath:instancePath+"/files/" + i2+"/lines",schemaPath:"#/properties/files/items/properties/lines/required",keyword:"required",params:{missingProperty: "changed"},message:"must have required property '"+"changed"+"'"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
if(data62.added !== undefined){
if(!(validate84(data62.added, {instancePath:instancePath+"/files/" + i2+"/lines/added",parentData:data62,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data62.deleted !== undefined){
if(!(validate84(data62.deleted, {instancePath:instancePath+"/files/" + i2+"/lines/deleted",parentData:data62,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data62.modified !== undefined){
if(!(validate84(data62.modified, {instancePath:instancePath+"/files/" + i2+"/lines/modified",parentData:data62,parentDataProperty:"modified",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data62.changed !== undefined){
if(!(validate84(data62.changed, {instancePath:instancePath+"/files/" + i2+"/lines/changed",parentData:data62,parentDataProperty:"changed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err99 = {instancePath:instancePath+"/files/" + i2+"/lines",schemaPath:"#/properties/files/items/properties/lines/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
}
if(data51.measurement !== undefined){
let data67 = data51.measurement;
if(data67 && typeof data67 == "object" && !Array.isArray(data67)){
if(data67.status === undefined){
const err100 = {instancePath:instancePath+"/files/" + i2+"/measurement",schemaPath:"#/properties/files/items/properties/measurement/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
if(data67.reasons === undefined){
const err101 = {instancePath:instancePath+"/files/" + i2+"/measurement",schemaPath:"#/properties/files/items/properties/measurement/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
if(data67.status !== undefined){
let data68 = data67.status;
if(!((((data68 === "exact") || (data68 === "bounded")) || (data68 === "unknown")) || (data68 === "unmeasurable"))){
const err102 = {instancePath:instancePath+"/files/" + i2+"/measurement/status",schemaPath:"#/properties/files/items/properties/measurement/properties/status/enum",keyword:"enum",params:{allowedValues: schema28.properties.files.items.properties.measurement.properties.status.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
}
if(data67.reasons !== undefined){
let data69 = data67.reasons;
if(Array.isArray(data69)){
const len3 = data69.length;
for(let i3=0; i3<len3; i3++){
let data70 = data69[i3];
if(data70 && typeof data70 == "object" && !Array.isArray(data70)){
if(data70.code === undefined){
const err103 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons/" + i3,schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
if(data70.code !== undefined){
let data71 = data70.code;
if(typeof data71 === "string"){
if(func1(data71) < 1){
const err104 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons/" + i3+"/code",schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
}
else {
const err105 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons/" + i3+"/code",schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
if(data70.subject !== undefined){
if(typeof data70.subject !== "string"){
const err106 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons/" + i3+"/subject",schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
}
if(data70.message !== undefined){
if(typeof data70.message !== "string"){
const err107 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons/" + i3+"/message",schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
}
}
else {
const err108 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons/" + i3,schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
}
}
else {
const err109 = {instancePath:instancePath+"/files/" + i2+"/measurement/reasons",schemaPath:"#/properties/files/items/properties/measurement/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
}
}
else {
const err110 = {instancePath:instancePath+"/files/" + i2+"/measurement",schemaPath:"#/properties/files/items/properties/measurement/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err110];
}
else {
vErrors.push(err110);
}
errors++;
}
}
if(data51.inclusionReasons !== undefined){
let data74 = data51.inclusionReasons;
if(Array.isArray(data74)){
const len4 = data74.length;
for(let i4=0; i4<len4; i4++){
let data75 = data74[i4];
if(data75 && typeof data75 == "object" && !Array.isArray(data75)){
if(data75.code === undefined){
const err111 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons/" + i4,schemaPath:"#/properties/files/items/properties/inclusionReasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err111];
}
else {
vErrors.push(err111);
}
errors++;
}
if(data75.code !== undefined){
let data76 = data75.code;
if(typeof data76 === "string"){
if(func1(data76) < 1){
const err112 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons/" + i4+"/code",schemaPath:"#/properties/files/items/properties/inclusionReasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err112];
}
else {
vErrors.push(err112);
}
errors++;
}
}
else {
const err113 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons/" + i4+"/code",schemaPath:"#/properties/files/items/properties/inclusionReasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err113];
}
else {
vErrors.push(err113);
}
errors++;
}
}
if(data75.subject !== undefined){
if(typeof data75.subject !== "string"){
const err114 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons/" + i4+"/subject",schemaPath:"#/properties/files/items/properties/inclusionReasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err114];
}
else {
vErrors.push(err114);
}
errors++;
}
}
if(data75.message !== undefined){
if(typeof data75.message !== "string"){
const err115 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons/" + i4+"/message",schemaPath:"#/properties/files/items/properties/inclusionReasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err115];
}
else {
vErrors.push(err115);
}
errors++;
}
}
}
else {
const err116 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons/" + i4,schemaPath:"#/properties/files/items/properties/inclusionReasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err116];
}
else {
vErrors.push(err116);
}
errors++;
}
}
}
else {
const err117 = {instancePath:instancePath+"/files/" + i2+"/inclusionReasons",schemaPath:"#/properties/files/items/properties/inclusionReasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err117];
}
else {
vErrors.push(err117);
}
errors++;
}
}
if(data51.family !== undefined){
let data79 = data51.family;
if(data79 && typeof data79 == "object" && !Array.isArray(data79)){
if(data79.id === undefined){
const err118 = {instancePath:instancePath+"/files/" + i2+"/family",schemaPath:"#/properties/files/items/properties/family/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err118];
}
else {
vErrors.push(err118);
}
errors++;
}
if(data79.rawCountsExact === undefined){
const err119 = {instancePath:instancePath+"/files/" + i2+"/family",schemaPath:"#/properties/files/items/properties/family/required",keyword:"required",params:{missingProperty: "rawCountsExact"},message:"must have required property '"+"rawCountsExact"+"'"};
if(vErrors === null){
vErrors = [err119];
}
else {
vErrors.push(err119);
}
errors++;
}
if(data79.blocksComplete === undefined){
const err120 = {instancePath:instancePath+"/files/" + i2+"/family",schemaPath:"#/properties/files/items/properties/family/required",keyword:"required",params:{missingProperty: "blocksComplete"},message:"must have required property '"+"blocksComplete"+"'"};
if(vErrors === null){
vErrors = [err120];
}
else {
vErrors.push(err120);
}
errors++;
}
if(data79.id !== undefined){
let data80 = data79.id;
if(typeof data80 === "string"){
if(func1(data80) < 1){
const err121 = {instancePath:instancePath+"/files/" + i2+"/family/id",schemaPath:"#/properties/files/items/properties/family/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err121];
}
else {
vErrors.push(err121);
}
errors++;
}
}
else {
const err122 = {instancePath:instancePath+"/files/" + i2+"/family/id",schemaPath:"#/properties/files/items/properties/family/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err122];
}
else {
vErrors.push(err122);
}
errors++;
}
}
if(data79.rawCountsExact !== undefined){
if(typeof data79.rawCountsExact !== "boolean"){
const err123 = {instancePath:instancePath+"/files/" + i2+"/family/rawCountsExact",schemaPath:"#/properties/files/items/properties/family/properties/rawCountsExact/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err123];
}
else {
vErrors.push(err123);
}
errors++;
}
}
if(data79.blocksComplete !== undefined){
if(typeof data79.blocksComplete !== "boolean"){
const err124 = {instancePath:instancePath+"/files/" + i2+"/family/blocksComplete",schemaPath:"#/properties/files/items/properties/family/properties/blocksComplete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err124];
}
else {
vErrors.push(err124);
}
errors++;
}
}
}
else {
const err125 = {instancePath:instancePath+"/files/" + i2+"/family",schemaPath:"#/properties/files/items/properties/family/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err125];
}
else {
vErrors.push(err125);
}
errors++;
}
}
}
else {
const err126 = {instancePath:instancePath+"/files/" + i2,schemaPath:"#/properties/files/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err126];
}
else {
vErrors.push(err126);
}
errors++;
}
}
}
else {
const err127 = {instancePath:instancePath+"/files",schemaPath:"#/properties/files/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err127];
}
else {
vErrors.push(err127);
}
errors++;
}
}
if(data.metrics !== undefined){
let data83 = data.metrics;
if(data83 && typeof data83 == "object" && !Array.isArray(data83)){
for(const key0 in data83){
const _errs149 = errors;
const _errs150 = errors;
const _errs151 = errors;
if(!(((key0 === "__proto__") || (key0 === "constructor")) || (key0 === "prototype"))){
const err128 = {};
if(vErrors === null){
vErrors = [err128];
}
else {
vErrors.push(err128);
}
errors++;
}
var valid28 = _errs151 === errors;
if(valid28){
const err129 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key0};
if(vErrors === null){
vErrors = [err129];
}
else {
vErrors.push(err129);
}
errors++;
}
else {
errors = _errs150;
if(vErrors !== null){
if(_errs150){
vErrors.length = _errs150;
}
else {
vErrors = null;
}
}
}
if(typeof key0 === "string"){
if(func1(key0) < 1){
const err130 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key0};
if(vErrors === null){
vErrors = [err130];
}
else {
vErrors.push(err130);
}
errors++;
}
}
var valid27 = _errs149 === errors;
if(!valid27){
const err131 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/propertyNames",keyword:"propertyNames",params:{propertyName: key0},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err131];
}
else {
vErrors.push(err131);
}
errors++;
}
}
for(const key1 in data83){
if(!(validate84(data83[key1], {instancePath:instancePath+"/metrics/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data83,parentDataProperty:key1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err132 = {instancePath:instancePath+"/metrics",schemaPath:"#/properties/metrics/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err132];
}
else {
vErrors.push(err132);
}
errors++;
}
}
if(data.bands !== undefined){
let data85 = data.bands;
if(data85 && typeof data85 == "object" && !Array.isArray(data85)){
for(const key2 in data85){
const _errs156 = errors;
const _errs157 = errors;
const _errs158 = errors;
if(!(((key2 === "__proto__") || (key2 === "constructor")) || (key2 === "prototype"))){
const err133 = {};
if(vErrors === null){
vErrors = [err133];
}
else {
vErrors.push(err133);
}
errors++;
}
var valid31 = _errs158 === errors;
if(valid31){
const err134 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key2};
if(vErrors === null){
vErrors = [err134];
}
else {
vErrors.push(err134);
}
errors++;
}
else {
errors = _errs157;
if(vErrors !== null){
if(_errs157){
vErrors.length = _errs157;
}
else {
vErrors = null;
}
}
}
if(typeof key2 === "string"){
if(func1(key2) < 1){
const err135 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key2};
if(vErrors === null){
vErrors = [err135];
}
else {
vErrors.push(err135);
}
errors++;
}
}
var valid30 = _errs156 === errors;
if(!valid30){
const err136 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/propertyNames",keyword:"propertyNames",params:{propertyName: key2},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err136];
}
else {
vErrors.push(err136);
}
errors++;
}
}
for(const key3 in data85){
let data86 = data85[key3];
const _errs161 = errors;
let valid33 = false;
let passing0 = null;
const _errs162 = errors;
if(data86 && typeof data86 == "object" && !Array.isArray(data86)){
if(data86.status === undefined){
const err137 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err137];
}
else {
vErrors.push(err137);
}
errors++;
}
if(data86.id === undefined){
const err138 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/0/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err138];
}
else {
vErrors.push(err138);
}
errors++;
}
if(data86.status !== undefined){
if("resolved" !== data86.status){
const err139 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/status",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "resolved"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err139];
}
else {
vErrors.push(err139);
}
errors++;
}
}
if(data86.id !== undefined){
let data88 = data86.id;
if(typeof data88 === "string"){
if(func1(data88) < 1){
const err140 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/id",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err140];
}
else {
vErrors.push(err140);
}
errors++;
}
}
else {
const err141 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/id",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err141];
}
else {
vErrors.push(err141);
}
errors++;
}
}
if(data86.lower !== undefined){
let data89 = data86.lower;
if((typeof data89 == "number") && (isFinite(data89))){
if(data89 > 1.7976931348623157e+308 || isNaN(data89)){
const err142 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/lower",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err142];
}
else {
vErrors.push(err142);
}
errors++;
}
if(data89 < -1.7976931348623157e+308 || isNaN(data89)){
const err143 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/lower",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err143];
}
else {
vErrors.push(err143);
}
errors++;
}
}
else {
const err144 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/lower",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err144];
}
else {
vErrors.push(err144);
}
errors++;
}
}
if(data86.upper !== undefined){
let data90 = data86.upper;
if((typeof data90 == "number") && (isFinite(data90))){
if(data90 > 1.7976931348623157e+308 || isNaN(data90)){
const err145 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/upper",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err145];
}
else {
vErrors.push(err145);
}
errors++;
}
if(data90 < -1.7976931348623157e+308 || isNaN(data90)){
const err146 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/upper",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err146];
}
else {
vErrors.push(err146);
}
errors++;
}
}
else {
const err147 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/upper",schemaPath:"#/properties/bands/additionalProperties/oneOf/0/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err147];
}
else {
vErrors.push(err147);
}
errors++;
}
}
}
else {
const err148 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err148];
}
else {
vErrors.push(err148);
}
errors++;
}
var _valid0 = _errs162 === errors;
if(_valid0){
valid33 = true;
passing0 = 0;
var props26 = true;
}
const _errs172 = errors;
const _errs174 = errors;
const _errs175 = errors;
if(data86 && typeof data86 == "object" && !Array.isArray(data86)){
let missing0;
if((data86.id === undefined) && (missing0 = "id")){
const err149 = {};
if(vErrors === null){
vErrors = [err149];
}
else {
vErrors.push(err149);
}
errors++;
}
}
var valid35 = _errs175 === errors;
if(valid35){
const err150 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err150];
}
else {
vErrors.push(err150);
}
errors++;
}
else {
errors = _errs174;
if(vErrors !== null){
if(_errs174){
vErrors.length = _errs174;
}
else {
vErrors = null;
}
}
}
if(data86 && typeof data86 == "object" && !Array.isArray(data86)){
if(data86.status === undefined){
const err151 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err151];
}
else {
vErrors.push(err151);
}
errors++;
}
if(data86.candidates === undefined){
const err152 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/1/required",keyword:"required",params:{missingProperty: "candidates"},message:"must have required property '"+"candidates"+"'"};
if(vErrors === null){
vErrors = [err152];
}
else {
vErrors.push(err152);
}
errors++;
}
if(data86.reasons === undefined){
const err153 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/1/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err153];
}
else {
vErrors.push(err153);
}
errors++;
}
if(data86.status !== undefined){
if("unknown" !== data86.status){
const err154 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/status",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err154];
}
else {
vErrors.push(err154);
}
errors++;
}
}
if(data86.candidates !== undefined){
let data92 = data86.candidates;
if(Array.isArray(data92)){
const len5 = data92.length;
for(let i5=0; i5<len5; i5++){
if(typeof data92[i5] !== "string"){
const err155 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/candidates/" + i5,schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/candidates/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err155];
}
else {
vErrors.push(err155);
}
errors++;
}
}
}
else {
const err156 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/candidates",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/candidates/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err156];
}
else {
vErrors.push(err156);
}
errors++;
}
}
if(data86.reasons !== undefined){
let data94 = data86.reasons;
if(Array.isArray(data94)){
if(data94.length < 1){
const err157 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err157];
}
else {
vErrors.push(err157);
}
errors++;
}
const len6 = data94.length;
for(let i6=0; i6<len6; i6++){
let data95 = data94[i6];
if(data95 && typeof data95 == "object" && !Array.isArray(data95)){
if(data95.code === undefined){
const err158 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons/" + i6,schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err158];
}
else {
vErrors.push(err158);
}
errors++;
}
if(data95.code !== undefined){
let data96 = data95.code;
if(typeof data96 === "string"){
if(func1(data96) < 1){
const err159 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons/" + i6+"/code",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err159];
}
else {
vErrors.push(err159);
}
errors++;
}
}
else {
const err160 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons/" + i6+"/code",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err160];
}
else {
vErrors.push(err160);
}
errors++;
}
}
if(data95.subject !== undefined){
if(typeof data95.subject !== "string"){
const err161 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons/" + i6+"/subject",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err161];
}
else {
vErrors.push(err161);
}
errors++;
}
}
if(data95.message !== undefined){
if(typeof data95.message !== "string"){
const err162 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons/" + i6+"/message",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err162];
}
else {
vErrors.push(err162);
}
errors++;
}
}
}
else {
const err163 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons/" + i6,schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err163];
}
else {
vErrors.push(err163);
}
errors++;
}
}
}
else {
const err164 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/reasons",schemaPath:"#/properties/bands/additionalProperties/oneOf/1/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err164];
}
else {
vErrors.push(err164);
}
errors++;
}
}
}
else {
const err165 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err165];
}
else {
vErrors.push(err165);
}
errors++;
}
var _valid0 = _errs172 === errors;
if(_valid0 && valid33){
valid33 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid33 = true;
passing0 = 1;
if(props26 !== true){
props26 = true;
}
}
}
if(!valid33){
const err166 = {instancePath:instancePath+"/bands/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/bands/additionalProperties/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err166];
}
else {
vErrors.push(err166);
}
errors++;
}
else {
errors = _errs161;
if(vErrors !== null){
if(_errs161){
vErrors.length = _errs161;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err167 = {instancePath:instancePath+"/bands",schemaPath:"#/properties/bands/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err167];
}
else {
vErrors.push(err167);
}
errors++;
}
}
if(data.rules !== undefined){
let data99 = data.rules;
if(data99 && typeof data99 == "object" && !Array.isArray(data99)){
for(const key4 in data99){
const _errs195 = errors;
const _errs196 = errors;
const _errs197 = errors;
if(!(((key4 === "__proto__") || (key4 === "constructor")) || (key4 === "prototype"))){
const err168 = {};
if(vErrors === null){
vErrors = [err168];
}
else {
vErrors.push(err168);
}
errors++;
}
var valid43 = _errs197 === errors;
if(valid43){
const err169 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key4};
if(vErrors === null){
vErrors = [err169];
}
else {
vErrors.push(err169);
}
errors++;
}
else {
errors = _errs196;
if(vErrors !== null){
if(_errs196){
vErrors.length = _errs196;
}
else {
vErrors = null;
}
}
}
if(typeof key4 === "string"){
if(func1(key4) < 1){
const err170 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key4};
if(vErrors === null){
vErrors = [err170];
}
else {
vErrors.push(err170);
}
errors++;
}
}
var valid42 = _errs195 === errors;
if(!valid42){
const err171 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames",keyword:"propertyNames",params:{propertyName: key4},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err171];
}
else {
vErrors.push(err171);
}
errors++;
}
}
for(const key5 in data99){
let data100 = data99[key5];
if(data100 && typeof data100 == "object" && !Array.isArray(data100)){
if(data100.disposition === undefined){
const err172 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/required",keyword:"required",params:{missingProperty: "disposition"},message:"must have required property '"+"disposition"+"'"};
if(vErrors === null){
vErrors = [err172];
}
else {
vErrors.push(err172);
}
errors++;
}
if(data100.decision !== undefined){
if(!(validate111(data100.decision, {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/decision",parentData:data100,parentDataProperty:"decision",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate111.errors : vErrors.concat(validate111.errors);
errors = vErrors.length;
}
}
if(data100.band !== undefined){
let data102 = data100.band;
const _errs204 = errors;
let valid46 = false;
let passing1 = null;
const _errs205 = errors;
if(data102 && typeof data102 == "object" && !Array.isArray(data102)){
if(data102.status === undefined){
const err173 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err173];
}
else {
vErrors.push(err173);
}
errors++;
}
if(data102.id === undefined){
const err174 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err174];
}
else {
vErrors.push(err174);
}
errors++;
}
if(data102.status !== undefined){
if("resolved" !== data102.status){
const err175 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/status",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "resolved"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err175];
}
else {
vErrors.push(err175);
}
errors++;
}
}
if(data102.id !== undefined){
let data104 = data102.id;
if(typeof data104 === "string"){
if(func1(data104) < 1){
const err176 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/id",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err176];
}
else {
vErrors.push(err176);
}
errors++;
}
}
else {
const err177 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/id",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err177];
}
else {
vErrors.push(err177);
}
errors++;
}
}
if(data102.lower !== undefined){
let data105 = data102.lower;
if((typeof data105 == "number") && (isFinite(data105))){
if(data105 > 1.7976931348623157e+308 || isNaN(data105)){
const err178 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/lower",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err178];
}
else {
vErrors.push(err178);
}
errors++;
}
if(data105 < -1.7976931348623157e+308 || isNaN(data105)){
const err179 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/lower",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err179];
}
else {
vErrors.push(err179);
}
errors++;
}
}
else {
const err180 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/lower",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err180];
}
else {
vErrors.push(err180);
}
errors++;
}
}
if(data102.upper !== undefined){
let data106 = data102.upper;
if((typeof data106 == "number") && (isFinite(data106))){
if(data106 > 1.7976931348623157e+308 || isNaN(data106)){
const err181 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/upper",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err181];
}
else {
vErrors.push(err181);
}
errors++;
}
if(data106 < -1.7976931348623157e+308 || isNaN(data106)){
const err182 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/upper",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err182];
}
else {
vErrors.push(err182);
}
errors++;
}
}
else {
const err183 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/upper",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err183];
}
else {
vErrors.push(err183);
}
errors++;
}
}
}
else {
const err184 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err184];
}
else {
vErrors.push(err184);
}
errors++;
}
var _valid1 = _errs205 === errors;
if(_valid1){
valid46 = true;
passing1 = 0;
var props28 = true;
}
const _errs215 = errors;
const _errs217 = errors;
const _errs218 = errors;
if(data102 && typeof data102 == "object" && !Array.isArray(data102)){
let missing1;
if((data102.id === undefined) && (missing1 = "id")){
const err185 = {};
if(vErrors === null){
vErrors = [err185];
}
else {
vErrors.push(err185);
}
errors++;
}
}
var valid48 = _errs218 === errors;
if(valid48){
const err186 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err186];
}
else {
vErrors.push(err186);
}
errors++;
}
else {
errors = _errs217;
if(vErrors !== null){
if(_errs217){
vErrors.length = _errs217;
}
else {
vErrors = null;
}
}
}
if(data102 && typeof data102 == "object" && !Array.isArray(data102)){
if(data102.status === undefined){
const err187 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err187];
}
else {
vErrors.push(err187);
}
errors++;
}
if(data102.candidates === undefined){
const err188 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/required",keyword:"required",params:{missingProperty: "candidates"},message:"must have required property '"+"candidates"+"'"};
if(vErrors === null){
vErrors = [err188];
}
else {
vErrors.push(err188);
}
errors++;
}
if(data102.reasons === undefined){
const err189 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err189];
}
else {
vErrors.push(err189);
}
errors++;
}
if(data102.status !== undefined){
if("unknown" !== data102.status){
const err190 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/status",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err190];
}
else {
vErrors.push(err190);
}
errors++;
}
}
if(data102.candidates !== undefined){
let data108 = data102.candidates;
if(Array.isArray(data108)){
const len7 = data108.length;
for(let i7=0; i7<len7; i7++){
if(typeof data108[i7] !== "string"){
const err191 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/candidates/" + i7,schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err191];
}
else {
vErrors.push(err191);
}
errors++;
}
}
}
else {
const err192 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/candidates",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err192];
}
else {
vErrors.push(err192);
}
errors++;
}
}
if(data102.reasons !== undefined){
let data110 = data102.reasons;
if(Array.isArray(data110)){
if(data110.length < 1){
const err193 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err193];
}
else {
vErrors.push(err193);
}
errors++;
}
const len8 = data110.length;
for(let i8=0; i8<len8; i8++){
let data111 = data110[i8];
if(data111 && typeof data111 == "object" && !Array.isArray(data111)){
if(data111.code === undefined){
const err194 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i8,schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err194];
}
else {
vErrors.push(err194);
}
errors++;
}
if(data111.code !== undefined){
let data112 = data111.code;
if(typeof data112 === "string"){
if(func1(data112) < 1){
const err195 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i8+"/code",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err195];
}
else {
vErrors.push(err195);
}
errors++;
}
}
else {
const err196 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i8+"/code",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err196];
}
else {
vErrors.push(err196);
}
errors++;
}
}
if(data111.subject !== undefined){
if(typeof data111.subject !== "string"){
const err197 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i8+"/subject",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err197];
}
else {
vErrors.push(err197);
}
errors++;
}
}
if(data111.message !== undefined){
if(typeof data111.message !== "string"){
const err198 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i8+"/message",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err198];
}
else {
vErrors.push(err198);
}
errors++;
}
}
}
else {
const err199 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i8,schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err199];
}
else {
vErrors.push(err199);
}
errors++;
}
}
}
else {
const err200 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err200];
}
else {
vErrors.push(err200);
}
errors++;
}
}
}
else {
const err201 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err201];
}
else {
vErrors.push(err201);
}
errors++;
}
var _valid1 = _errs215 === errors;
if(_valid1 && valid46){
valid46 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid46 = true;
passing1 = 1;
if(props28 !== true){
props28 = true;
}
}
}
if(!valid46){
const err202 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err202];
}
else {
vErrors.push(err202);
}
errors++;
}
else {
errors = _errs204;
if(vErrors !== null){
if(_errs204){
vErrors.length = _errs204;
}
else {
vErrors = null;
}
}
}
}
if(data100.disposition !== undefined){
let data115 = data100.disposition;
if(!((((data115 === "matched") || (data115 === "unmatched")) || (data115 === "held")) || (data115 === "fallback"))){
const err203 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1")+"/disposition",schemaPath:"#/properties/rules/additionalProperties/properties/disposition/enum",keyword:"enum",params:{allowedValues: schema28.properties.rules.additionalProperties.properties.disposition.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err203];
}
else {
vErrors.push(err203);
}
errors++;
}
}
}
else {
const err204 = {instancePath:instancePath+"/rules/" + key5.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err204];
}
else {
vErrors.push(err204);
}
errors++;
}
}
}
else {
const err205 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err205];
}
else {
vErrors.push(err205);
}
errors++;
}
}
if(data.scopes !== undefined){
let data116 = data.scopes;
if(data116 && typeof data116 == "object" && !Array.isArray(data116)){
for(const key6 in data116){
const _errs239 = errors;
const _errs240 = errors;
const _errs241 = errors;
if(!(((key6 === "__proto__") || (key6 === "constructor")) || (key6 === "prototype"))){
const err206 = {};
if(vErrors === null){
vErrors = [err206];
}
else {
vErrors.push(err206);
}
errors++;
}
var valid56 = _errs241 === errors;
if(valid56){
const err207 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key6};
if(vErrors === null){
vErrors = [err207];
}
else {
vErrors.push(err207);
}
errors++;
}
else {
errors = _errs240;
if(vErrors !== null){
if(_errs240){
vErrors.length = _errs240;
}
else {
vErrors = null;
}
}
}
if(typeof key6 === "string"){
if(func1(key6) < 1){
const err208 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key6};
if(vErrors === null){
vErrors = [err208];
}
else {
vErrors.push(err208);
}
errors++;
}
}
var valid55 = _errs239 === errors;
if(!valid55){
const err209 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/propertyNames",keyword:"propertyNames",params:{propertyName: key6},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err209];
}
else {
vErrors.push(err209);
}
errors++;
}
}
for(const key7 in data116){
let data117 = data116[key7];
if(data117 && typeof data117 == "object" && !Array.isArray(data117)){
if(data117.fileIds === undefined){
const err210 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/scopes/additionalProperties/required",keyword:"required",params:{missingProperty: "fileIds"},message:"must have required property '"+"fileIds"+"'"};
if(vErrors === null){
vErrors = [err210];
}
else {
vErrors.push(err210);
}
errors++;
}
if(data117.fileSet === undefined){
const err211 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/scopes/additionalProperties/required",keyword:"required",params:{missingProperty: "fileSet"},message:"must have required property '"+"fileSet"+"'"};
if(vErrors === null){
vErrors = [err211];
}
else {
vErrors.push(err211);
}
errors++;
}
if(data117.totals === undefined){
const err212 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/scopes/additionalProperties/required",keyword:"required",params:{missingProperty: "totals"},message:"must have required property '"+"totals"+"'"};
if(vErrors === null){
vErrors = [err212];
}
else {
vErrors.push(err212);
}
errors++;
}
if(data117.fileIds !== undefined){
let data118 = data117.fileIds;
if(Array.isArray(data118)){
const len9 = data118.length;
for(let i9=0; i9<len9; i9++){
if(typeof data118[i9] !== "string"){
const err213 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileIds/" + i9,schemaPath:"#/properties/scopes/additionalProperties/properties/fileIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err213];
}
else {
vErrors.push(err213);
}
errors++;
}
}
let i10 = data118.length;
let j0;
if(i10 > 1){
const indices0 = {};
for(;i10--;){
let item0 = data118[i10];
if(typeof item0 !== "string"){
continue;
}
if(typeof indices0[item0] == "number"){
j0 = indices0[item0];
const err214 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileIds",schemaPath:"#/properties/scopes/additionalProperties/properties/fileIds/uniqueItems",keyword:"uniqueItems",params:{i: i10, j: j0},message:"must NOT have duplicate items (items ## "+j0+" and "+i10+" are identical)"};
if(vErrors === null){
vErrors = [err214];
}
else {
vErrors.push(err214);
}
errors++;
break;
}
indices0[item0] = i10;
}
}
}
else {
const err215 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileIds",schemaPath:"#/properties/scopes/additionalProperties/properties/fileIds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err215];
}
else {
vErrors.push(err215);
}
errors++;
}
}
if(data117.fileSet !== undefined){
let data120 = data117.fileSet;
if(data120 && typeof data120 == "object" && !Array.isArray(data120)){
if(data120.complete === undefined){
const err216 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileSet",schemaPath:"#/properties/scopes/additionalProperties/properties/fileSet/required",keyword:"required",params:{missingProperty: "complete"},message:"must have required property '"+"complete"+"'"};
if(vErrors === null){
vErrors = [err216];
}
else {
vErrors.push(err216);
}
errors++;
}
if(data120.total === undefined){
const err217 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileSet",schemaPath:"#/properties/scopes/additionalProperties/properties/fileSet/required",keyword:"required",params:{missingProperty: "total"},message:"must have required property '"+"total"+"'"};
if(vErrors === null){
vErrors = [err217];
}
else {
vErrors.push(err217);
}
errors++;
}
if(data120.complete !== undefined){
if(typeof data120.complete !== "boolean"){
const err218 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileSet/complete",schemaPath:"#/properties/scopes/additionalProperties/properties/fileSet/properties/complete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err218];
}
else {
vErrors.push(err218);
}
errors++;
}
}
if(data120.total !== undefined){
if(!(validate84(data120.total, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileSet/total",parentData:data120,parentDataProperty:"total",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err219 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/fileSet",schemaPath:"#/properties/scopes/additionalProperties/properties/fileSet/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err219];
}
else {
vErrors.push(err219);
}
errors++;
}
}
if(data117.totals !== undefined){
let data123 = data117.totals;
if(data123 && typeof data123 == "object" && !Array.isArray(data123)){
if(data123.raw === undefined){
const err220 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/required",keyword:"required",params:{missingProperty: "raw"},message:"must have required property '"+"raw"+"'"};
if(vErrors === null){
vErrors = [err220];
}
else {
vErrors.push(err220);
}
errors++;
}
if(data123.lines === undefined){
const err221 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/required",keyword:"required",params:{missingProperty: "lines"},message:"must have required property '"+"lines"+"'"};
if(vErrors === null){
vErrors = [err221];
}
else {
vErrors.push(err221);
}
errors++;
}
if(data123.files === undefined){
const err222 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/required",keyword:"required",params:{missingProperty: "files"},message:"must have required property '"+"files"+"'"};
if(vErrors === null){
vErrors = [err222];
}
else {
vErrors.push(err222);
}
errors++;
}
if(data123.raw !== undefined){
let data124 = data123.raw;
if(data124 && typeof data124 == "object" && !Array.isArray(data124)){
if(data124.added === undefined){
const err223 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/raw/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err223];
}
else {
vErrors.push(err223);
}
errors++;
}
if(data124.deleted === undefined){
const err224 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/raw/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err224];
}
else {
vErrors.push(err224);
}
errors++;
}
if(data124.churn === undefined){
const err225 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/raw/required",keyword:"required",params:{missingProperty: "churn"},message:"must have required property '"+"churn"+"'"};
if(vErrors === null){
vErrors = [err225];
}
else {
vErrors.push(err225);
}
errors++;
}
if(data124.added !== undefined){
if(!(validate84(data124.added, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw/added",parentData:data124,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data124.deleted !== undefined){
if(!(validate84(data124.deleted, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw/deleted",parentData:data124,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data124.churn !== undefined){
if(!(validate84(data124.churn, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw/churn",parentData:data124,parentDataProperty:"churn",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err226 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/raw",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/raw/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err226];
}
else {
vErrors.push(err226);
}
errors++;
}
}
if(data123.lines !== undefined){
let data128 = data123.lines;
if(data128 && typeof data128 == "object" && !Array.isArray(data128)){
if(data128.added === undefined){
const err227 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err227];
}
else {
vErrors.push(err227);
}
errors++;
}
if(data128.deleted === undefined){
const err228 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err228];
}
else {
vErrors.push(err228);
}
errors++;
}
if(data128.modified === undefined){
const err229 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "modified"},message:"must have required property '"+"modified"+"'"};
if(vErrors === null){
vErrors = [err229];
}
else {
vErrors.push(err229);
}
errors++;
}
if(data128.changed === undefined){
const err230 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/lines/required",keyword:"required",params:{missingProperty: "changed"},message:"must have required property '"+"changed"+"'"};
if(vErrors === null){
vErrors = [err230];
}
else {
vErrors.push(err230);
}
errors++;
}
if(data128.added !== undefined){
if(!(validate84(data128.added, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines/added",parentData:data128,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data128.deleted !== undefined){
if(!(validate84(data128.deleted, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines/deleted",parentData:data128,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data128.modified !== undefined){
if(!(validate84(data128.modified, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines/modified",parentData:data128,parentDataProperty:"modified",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data128.changed !== undefined){
if(!(validate84(data128.changed, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines/changed",parentData:data128,parentDataProperty:"changed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err231 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/lines",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/lines/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err231];
}
else {
vErrors.push(err231);
}
errors++;
}
}
if(data123.files !== undefined){
let data133 = data123.files;
if(data133 && typeof data133 == "object" && !Array.isArray(data133)){
if(data133.included === undefined){
const err232 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "included"},message:"must have required property '"+"included"+"'"};
if(vErrors === null){
vErrors = [err232];
}
else {
vErrors.push(err232);
}
errors++;
}
if(data133.added === undefined){
const err233 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "added"},message:"must have required property '"+"added"+"'"};
if(vErrors === null){
vErrors = [err233];
}
else {
vErrors.push(err233);
}
errors++;
}
if(data133.deleted === undefined){
const err234 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "deleted"},message:"must have required property '"+"deleted"+"'"};
if(vErrors === null){
vErrors = [err234];
}
else {
vErrors.push(err234);
}
errors++;
}
if(data133.modified === undefined){
const err235 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "modified"},message:"must have required property '"+"modified"+"'"};
if(vErrors === null){
vErrors = [err235];
}
else {
vErrors.push(err235);
}
errors++;
}
if(data133.renamed === undefined){
const err236 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "renamed"},message:"must have required property '"+"renamed"+"'"};
if(vErrors === null){
vErrors = [err236];
}
else {
vErrors.push(err236);
}
errors++;
}
if(data133.copied === undefined){
const err237 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "copied"},message:"must have required property '"+"copied"+"'"};
if(vErrors === null){
vErrors = [err237];
}
else {
vErrors.push(err237);
}
errors++;
}
if(data133.binary === undefined){
const err238 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "binary"},message:"must have required property '"+"binary"+"'"};
if(vErrors === null){
vErrors = [err238];
}
else {
vErrors.push(err238);
}
errors++;
}
if(data133.unmeasurable === undefined){
const err239 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/required",keyword:"required",params:{missingProperty: "unmeasurable"},message:"must have required property '"+"unmeasurable"+"'"};
if(vErrors === null){
vErrors = [err239];
}
else {
vErrors.push(err239);
}
errors++;
}
if(data133.included !== undefined){
if(!(validate84(data133.included, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/included",parentData:data133,parentDataProperty:"included",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.added !== undefined){
if(!(validate84(data133.added, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/added",parentData:data133,parentDataProperty:"added",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.deleted !== undefined){
if(!(validate84(data133.deleted, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/deleted",parentData:data133,parentDataProperty:"deleted",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.modified !== undefined){
if(!(validate84(data133.modified, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/modified",parentData:data133,parentDataProperty:"modified",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.renamed !== undefined){
if(!(validate84(data133.renamed, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/renamed",parentData:data133,parentDataProperty:"renamed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.copied !== undefined){
if(!(validate84(data133.copied, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/copied",parentData:data133,parentDataProperty:"copied",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.binary !== undefined){
if(!(validate84(data133.binary, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/binary",parentData:data133,parentDataProperty:"binary",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
if(data133.unmeasurable !== undefined){
if(!(validate84(data133.unmeasurable, {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files/unmeasurable",parentData:data133,parentDataProperty:"unmeasurable",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
}
}
else {
const err240 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals/files",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/properties/files/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err240];
}
else {
vErrors.push(err240);
}
errors++;
}
}
}
else {
const err241 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1")+"/totals",schemaPath:"#/properties/scopes/additionalProperties/properties/totals/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err241];
}
else {
vErrors.push(err241);
}
errors++;
}
}
}
else {
const err242 = {instancePath:instancePath+"/scopes/" + key7.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/scopes/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err242];
}
else {
vErrors.push(err242);
}
errors++;
}
}
}
else {
const err243 = {instancePath:instancePath+"/scopes",schemaPath:"#/properties/scopes/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err243];
}
else {
vErrors.push(err243);
}
errors++;
}
}
if(data.policyId !== undefined){
if(typeof data.policyId !== "string"){
const err244 = {instancePath:instancePath+"/policyId",schemaPath:"#/properties/policyId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err244];
}
else {
vErrors.push(err244);
}
errors++;
}
}
if(data.reportId !== undefined){
if(typeof data.reportId !== "string"){
const err245 = {instancePath:instancePath+"/reportId",schemaPath:"#/properties/reportId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err245];
}
else {
vErrors.push(err245);
}
errors++;
}
}
if(data.producer !== undefined){
let data144 = data.producer;
if(data144 && typeof data144 == "object" && !Array.isArray(data144)){
if(data144.name !== undefined){
if(typeof data144.name !== "string"){
const err246 = {instancePath:instancePath+"/producer/name",schemaPath:"#/properties/producer/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err246];
}
else {
vErrors.push(err246);
}
errors++;
}
}
if(data144.version !== undefined){
if(typeof data144.version !== "string"){
const err247 = {instancePath:instancePath+"/producer/version",schemaPath:"#/properties/producer/properties/version/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err247];
}
else {
vErrors.push(err247);
}
errors++;
}
}
}
else {
const err248 = {instancePath:instancePath+"/producer",schemaPath:"#/properties/producer/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err248];
}
else {
vErrors.push(err248);
}
errors++;
}
}
if(data.metricTypes !== undefined){
let data147 = data.metricTypes;
if(data147 && typeof data147 == "object" && !Array.isArray(data147)){
for(const key8 in data147){
let data148 = data147[key8];
if(!((data148 === "integer") || (data148 === "float"))){
const err249 = {instancePath:instancePath+"/metricTypes/" + key8.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/metricTypes/additionalProperties/enum",keyword:"enum",params:{allowedValues: schema28.properties.metricTypes.additionalProperties.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err249];
}
else {
vErrors.push(err249);
}
errors++;
}
}
}
else {
const err250 = {instancePath:instancePath+"/metricTypes",schemaPath:"#/properties/metricTypes/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err250];
}
else {
vErrors.push(err250);
}
errors++;
}
}
if(data.metrics !== undefined){
if(data.metricTypes === undefined){
const err251 = {instancePath,schemaPath:"#/dependentRequired",keyword:"dependentRequired",params:{property: "metrics",
    missingProperty: "metricTypes",
    depsCount: 1,
    deps: "metricTypes"},message:"must have property metricTypes when property metrics is present"};
if(vErrors === null){
vErrors = [err251];
}
else {
vErrors.push(err251);
}
errors++;
}
}
if(data.metricTypes !== undefined){
if(data.metrics === undefined){
const err252 = {instancePath,schemaPath:"#/dependentRequired",keyword:"dependentRequired",params:{property: "metricTypes",
    missingProperty: "metrics",
    depsCount: 1,
    deps: "metrics"},message:"must have property metrics when property metricTypes is present"};
if(vErrors === null){
vErrors = [err252];
}
else {
vErrors.push(err252);
}
errors++;
}
}
}
else {
const err253 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err253];
}
else {
vErrors.push(err253);
}
errors++;
}
validate83.errors = vErrors;
return errors === 0;
}
validate83.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

exports.plan = validate129;
const schema31 = {"type":"object","properties":{"kind":{"const":"diffdevil.plan"},"schemaVersion":{"const":"1.0"},"semantics":{"type":"object","properties":{"language":{"const":"diffdevil-expr/1"},"numbers":{"const":"diffdevil-number/1"},"replacementLines":{"const":"replacement-lines-v1"},"paths":{"const":"diffdevil-glob/1"},"presets":{"type":"array","items":{"type":"string"}},"limits":{"type":"string"}},"additionalProperties":true,"required":["language","numbers","replacementLines","paths"]},"stage":{"enum":["desired","materialized"]},"source":{"type":"object","properties":{"kind":{"enum":["git","unified-diff","github-api"]},"comparisonId":{"type":"string","minLength":1},"base":{"type":"string"},"head":{"type":"string"},"comparison":{"enum":["three-dot","direct","worktree","staged","supplied"]},"repository":{"type":"string"},"pullRequest":{"type":"integer","minimum":1,"maximum":9007199254740991},"baseTip":{"type":"string","description":"Current pull-request base tip when a Git three-dot diff begins at an older merge base."}},"additionalProperties":true,"required":["kind","comparisonId"]},"reportId":{"type":"string","minLength":1},"policyId":{"type":"string","minLength":1},"target":{"type":"object","properties":{"repository":{"type":"string","minLength":1},"pullRequest":{"type":"integer","minimum":1,"maximum":9007199254740991}},"additionalProperties":false,"required":["repository","pullRequest"]},"rules":{"type":"object","additionalProperties":{"type":"object","properties":{"decision":{"$ref":"urn:diffdevil:values:1#/$defs/decision"},"band":{"oneOf":[{"type":"object","properties":{"status":{"const":"resolved"},"id":{"type":"string","minLength":1},"lower":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308},"upper":{"type":"number","minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}},"additionalProperties":true,"required":["status","id"]},{"type":"object","properties":{"status":{"const":"unknown"},"candidates":{"type":"array","items":{"type":"string"}},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":true,"required":["status","candidates","reasons"],"not":{"required":["id"]}}]},"disposition":{"enum":["matched","unmatched","held","fallback"]}},"additionalProperties":true,"required":["disposition"]},"propertyNames":{"minLength":1,"not":{"enum":["__proto__","constructor","prototype"]}}},"held":{"type":"array","items":{"type":"object","properties":{"rule":{"type":"string"},"reasons":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]},"minItems":1}},"additionalProperties":false,"required":["rule","reasons"]}},"operations":{"type":"array","items":{"oneOf":[{"type":"object","properties":{"kind":{"const":"label.ensure"},"rule":{"type":"string"},"name":{"type":"string"},"definition":{"type":"object","properties":{"color":{"type":"string","pattern":"^[0-9a-fA-F]{6}$"},"description":{"type":"string","maxLength":100}},"additionalProperties":false,"required":["color","description"]}},"additionalProperties":false,"required":["kind","name","definition"]},{"type":"object","properties":{"kind":{"const":"label.sync"},"rule":{"type":"string"},"name":{"type":"string"},"definition":{"type":"object","properties":{"color":{"type":"string","pattern":"^[0-9a-fA-F]{6}$"},"description":{"type":"string","maxLength":100}},"additionalProperties":false,"required":["color","description"]}},"additionalProperties":false,"required":["kind","name","definition"]},{"type":"object","properties":{"kind":{"const":"label.add"},"rule":{"type":"string"},"name":{"type":"string"}},"additionalProperties":false,"required":["kind","rule","name"]},{"type":"object","properties":{"kind":{"const":"label.remove"},"rule":{"type":"string"},"name":{"type":"string"}},"additionalProperties":false,"required":["kind","rule","name"]},{"type":"object","properties":{"kind":{"const":"label.select"},"rule":{"type":"string"},"group":{"type":"string"},"members":{"type":"array","items":{"type":"string"}},"selected":{"type":"string"}},"additionalProperties":false,"required":["kind","rule","group","members","selected"]},{"type":"object","properties":{"kind":{"const":"comment.reconcile"},"rule":{"type":"string"},"mode":{"enum":["create","once","upsert","once-per-transition"]},"trigger":{"enum":["always","matched","band-changed"]},"body":{"type":"string"},"occasionId":{"type":"string"}},"additionalProperties":false,"required":["kind","rule","mode","trigger","body"]}]}},"preconditions":{"type":"object","properties":{"head":{"type":"string"},"base":{"type":"string"},"providerStateId":{"type":"string"}},"additionalProperties":false,"required":[]}},"additionalProperties":false,"required":["kind","schemaVersion","semantics","stage","source","reportId","policyId","target","rules","held","operations"],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:diffdevil:plan:1","title":"diffdevil effect plan 1.0","description":"Closed operation union; freshness, ownership, group membership and trusted provenance require adapter validation. A hash does not authenticate an artifact."};

function validate130(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate130.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.value === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.status !== undefined){
if("resolved" !== data.status){
const err2 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "resolved"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.value !== undefined){
if(typeof data.value !== "boolean"){
const err3 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/0/properties/value/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs7 = errors;
const _errs9 = errors;
const _errs10 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.value === undefined) && (missing0 = "value")){
const err5 = {};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
var valid2 = _errs10 === errors;
if(valid2){
const err6 = {instancePath,schemaPath:"#/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.status === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.reasons === undefined){
const err8 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.status !== undefined){
if("unknown" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.reasons !== undefined){
let data3 = data.reasons;
if(Array.isArray(data3)){
if(data3.length < 1){
const err10 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/1/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
let data4 = data3[i0];
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.code === undefined){
const err11 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/1/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data4.code !== undefined){
let data5 = data4.code;
if(typeof data5 === "string"){
if(func1(data5) < 1){
const err12 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/1/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/1/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data4.subject !== undefined){
if(typeof data4.subject !== "string"){
const err14 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/1/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data4.message !== undefined){
if(typeof data4.message !== "string"){
const err15 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/1/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/1/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/1/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err19 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate130.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate130.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate129(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="urn:diffdevil:plan:1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate129.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.schemaVersion === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.semantics === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "semantics"},message:"must have required property '"+"semantics"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.stage === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stage"},message:"must have required property '"+"stage"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.source === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.reportId === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "reportId"},message:"must have required property '"+"reportId"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.policyId === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "policyId"},message:"must have required property '"+"policyId"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.target === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "target"},message:"must have required property '"+"target"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.rules === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "rules"},message:"must have required property '"+"rules"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.held === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "held"},message:"must have required property '"+"held"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.operations === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "operations"},message:"must have required property '"+"operations"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
for(const key0 in data){
if(!(func9.call(schema31.properties, key0))){
const err11 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.kind !== undefined){
if("diffdevil.plan" !== data.kind){
const err12 = {instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "diffdevil.plan"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if("1.0" !== data.schemaVersion){
const err13 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.semantics !== undefined){
let data2 = data.semantics;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.language === undefined){
const err14 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "language"},message:"must have required property '"+"language"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data2.numbers === undefined){
const err15 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "numbers"},message:"must have required property '"+"numbers"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data2.replacementLines === undefined){
const err16 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "replacementLines"},message:"must have required property '"+"replacementLines"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data2.paths === undefined){
const err17 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data2.language !== undefined){
if("diffdevil-expr/1" !== data2.language){
const err18 = {instancePath:instancePath+"/semantics/language",schemaPath:"#/properties/semantics/properties/language/const",keyword:"const",params:{allowedValue: "diffdevil-expr/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data2.numbers !== undefined){
if("diffdevil-number/1" !== data2.numbers){
const err19 = {instancePath:instancePath+"/semantics/numbers",schemaPath:"#/properties/semantics/properties/numbers/const",keyword:"const",params:{allowedValue: "diffdevil-number/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data2.replacementLines !== undefined){
if("replacement-lines-v1" !== data2.replacementLines){
const err20 = {instancePath:instancePath+"/semantics/replacementLines",schemaPath:"#/properties/semantics/properties/replacementLines/const",keyword:"const",params:{allowedValue: "replacement-lines-v1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data2.paths !== undefined){
if("diffdevil-glob/1" !== data2.paths){
const err21 = {instancePath:instancePath+"/semantics/paths",schemaPath:"#/properties/semantics/properties/paths/const",keyword:"const",params:{allowedValue: "diffdevil-glob/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data2.presets !== undefined){
let data7 = data2.presets;
if(Array.isArray(data7)){
const len0 = data7.length;
for(let i0=0; i0<len0; i0++){
if(typeof data7[i0] !== "string"){
const err22 = {instancePath:instancePath+"/semantics/presets/" + i0,schemaPath:"#/properties/semantics/properties/presets/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
}
else {
const err23 = {instancePath:instancePath+"/semantics/presets",schemaPath:"#/properties/semantics/properties/presets/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data2.limits !== undefined){
if(typeof data2.limits !== "string"){
const err24 = {instancePath:instancePath+"/semantics/limits",schemaPath:"#/properties/semantics/properties/limits/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data.stage !== undefined){
let data10 = data.stage;
if(!((data10 === "desired") || (data10 === "materialized"))){
const err26 = {instancePath:instancePath+"/stage",schemaPath:"#/properties/stage/enum",keyword:"enum",params:{allowedValues: schema31.properties.stage.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.source !== undefined){
let data11 = data.source;
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.kind === undefined){
const err27 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data11.comparisonId === undefined){
const err28 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "comparisonId"},message:"must have required property '"+"comparisonId"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data11.kind !== undefined){
let data12 = data11.kind;
if(!(((data12 === "git") || (data12 === "unified-diff")) || (data12 === "github-api"))){
const err29 = {instancePath:instancePath+"/source/kind",schemaPath:"#/properties/source/properties/kind/enum",keyword:"enum",params:{allowedValues: schema31.properties.source.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data11.comparisonId !== undefined){
let data13 = data11.comparisonId;
if(typeof data13 === "string"){
if(func1(data13) < 1){
const err30 = {instancePath:instancePath+"/source/comparisonId",schemaPath:"#/properties/source/properties/comparisonId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
else {
const err31 = {instancePath:instancePath+"/source/comparisonId",schemaPath:"#/properties/source/properties/comparisonId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data11.base !== undefined){
if(typeof data11.base !== "string"){
const err32 = {instancePath:instancePath+"/source/base",schemaPath:"#/properties/source/properties/base/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data11.head !== undefined){
if(typeof data11.head !== "string"){
const err33 = {instancePath:instancePath+"/source/head",schemaPath:"#/properties/source/properties/head/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data11.comparison !== undefined){
let data16 = data11.comparison;
if(!(((((data16 === "three-dot") || (data16 === "direct")) || (data16 === "worktree")) || (data16 === "staged")) || (data16 === "supplied"))){
const err34 = {instancePath:instancePath+"/source/comparison",schemaPath:"#/properties/source/properties/comparison/enum",keyword:"enum",params:{allowedValues: schema31.properties.source.properties.comparison.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data11.repository !== undefined){
if(typeof data11.repository !== "string"){
const err35 = {instancePath:instancePath+"/source/repository",schemaPath:"#/properties/source/properties/repository/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data11.pullRequest !== undefined){
let data18 = data11.pullRequest;
if(!(((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18))) && (isFinite(data18)))){
const err36 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if((typeof data18 == "number") && (isFinite(data18))){
if(data18 > 9007199254740991 || isNaN(data18)){
const err37 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data18 < 1 || isNaN(data18)){
const err38 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
if(data11.baseTip !== undefined){
if(typeof data11.baseTip !== "string"){
const err39 = {instancePath:instancePath+"/source/baseTip",schemaPath:"#/properties/source/properties/baseTip/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
else {
const err40 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data.reportId !== undefined){
let data20 = data.reportId;
if(typeof data20 === "string"){
if(func1(data20) < 1){
const err41 = {instancePath:instancePath+"/reportId",schemaPath:"#/properties/reportId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
else {
const err42 = {instancePath:instancePath+"/reportId",schemaPath:"#/properties/reportId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data.policyId !== undefined){
let data21 = data.policyId;
if(typeof data21 === "string"){
if(func1(data21) < 1){
const err43 = {instancePath:instancePath+"/policyId",schemaPath:"#/properties/policyId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
else {
const err44 = {instancePath:instancePath+"/policyId",schemaPath:"#/properties/policyId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data.target !== undefined){
let data22 = data.target;
if(data22 && typeof data22 == "object" && !Array.isArray(data22)){
if(data22.repository === undefined){
const err45 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/required",keyword:"required",params:{missingProperty: "repository"},message:"must have required property '"+"repository"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data22.pullRequest === undefined){
const err46 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/required",keyword:"required",params:{missingProperty: "pullRequest"},message:"must have required property '"+"pullRequest"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
for(const key1 in data22){
if(!((key1 === "repository") || (key1 === "pullRequest"))){
const err47 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data22.repository !== undefined){
let data23 = data22.repository;
if(typeof data23 === "string"){
if(func1(data23) < 1){
const err48 = {instancePath:instancePath+"/target/repository",schemaPath:"#/properties/target/properties/repository/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
else {
const err49 = {instancePath:instancePath+"/target/repository",schemaPath:"#/properties/target/properties/repository/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data22.pullRequest !== undefined){
let data24 = data22.pullRequest;
if(!(((typeof data24 == "number") && (!(data24 % 1) && !isNaN(data24))) && (isFinite(data24)))){
const err50 = {instancePath:instancePath+"/target/pullRequest",schemaPath:"#/properties/target/properties/pullRequest/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if((typeof data24 == "number") && (isFinite(data24))){
if(data24 > 9007199254740991 || isNaN(data24)){
const err51 = {instancePath:instancePath+"/target/pullRequest",schemaPath:"#/properties/target/properties/pullRequest/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data24 < 1 || isNaN(data24)){
const err52 = {instancePath:instancePath+"/target/pullRequest",schemaPath:"#/properties/target/properties/pullRequest/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
}
}
else {
const err53 = {instancePath:instancePath+"/target",schemaPath:"#/properties/target/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data.rules !== undefined){
let data25 = data.rules;
if(data25 && typeof data25 == "object" && !Array.isArray(data25)){
for(const key2 in data25){
const _errs48 = errors;
const _errs49 = errors;
const _errs50 = errors;
if(!(((key2 === "__proto__") || (key2 === "constructor")) || (key2 === "prototype"))){
const err54 = {};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
var valid7 = _errs50 === errors;
if(valid7){
const err55 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key2};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
else {
errors = _errs49;
if(vErrors !== null){
if(_errs49){
vErrors.length = _errs49;
}
else {
vErrors = null;
}
}
}
if(typeof key2 === "string"){
if(func1(key2) < 1){
const err56 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key2};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
var valid6 = _errs48 === errors;
if(!valid6){
const err57 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/propertyNames",keyword:"propertyNames",params:{propertyName: key2},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
for(const key3 in data25){
let data26 = data25[key3];
if(data26 && typeof data26 == "object" && !Array.isArray(data26)){
if(data26.disposition === undefined){
const err58 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/required",keyword:"required",params:{missingProperty: "disposition"},message:"must have required property '"+"disposition"+"'"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
if(data26.decision !== undefined){
if(!(validate130(data26.decision, {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/decision",parentData:data26,parentDataProperty:"decision",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate130.errors : vErrors.concat(validate130.errors);
errors = vErrors.length;
}
}
if(data26.band !== undefined){
let data28 = data26.band;
const _errs57 = errors;
let valid10 = false;
let passing0 = null;
const _errs58 = errors;
if(data28 && typeof data28 == "object" && !Array.isArray(data28)){
if(data28.status === undefined){
const err59 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
if(data28.id === undefined){
const err60 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(data28.status !== undefined){
if("resolved" !== data28.status){
const err61 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/status",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/status/const",keyword:"const",params:{allowedValue: "resolved"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data28.id !== undefined){
let data30 = data28.id;
if(typeof data30 === "string"){
if(func1(data30) < 1){
const err62 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/id",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
else {
const err63 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/id",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
if(data28.lower !== undefined){
let data31 = data28.lower;
if((typeof data31 == "number") && (isFinite(data31))){
if(data31 > 1.7976931348623157e+308 || isNaN(data31)){
const err64 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/lower",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
if(data31 < -1.7976931348623157e+308 || isNaN(data31)){
const err65 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/lower",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
else {
const err66 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/lower",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data28.upper !== undefined){
let data32 = data28.upper;
if((typeof data32 == "number") && (isFinite(data32))){
if(data32 > 1.7976931348623157e+308 || isNaN(data32)){
const err67 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/upper",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1.7976931348623157e+308},message:"must be <= 1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(data32 < -1.7976931348623157e+308 || isNaN(data32)){
const err68 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/upper",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper/minimum",keyword:"minimum",params:{comparison: ">=", limit: -1.7976931348623157e+308},message:"must be >= -1.7976931348623157e+308"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
else {
const err69 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/upper",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
}
else {
const err70 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
var _valid0 = _errs58 === errors;
if(_valid0){
valid10 = true;
passing0 = 0;
var props1 = true;
}
const _errs68 = errors;
const _errs70 = errors;
const _errs71 = errors;
if(data28 && typeof data28 == "object" && !Array.isArray(data28)){
let missing0;
if((data28.id === undefined) && (missing0 = "id")){
const err71 = {};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
var valid12 = _errs71 === errors;
if(valid12){
const err72 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/not",keyword:"not",params:{},message:"must NOT be valid"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
else {
errors = _errs70;
if(vErrors !== null){
if(_errs70){
vErrors.length = _errs70;
}
else {
vErrors = null;
}
}
}
if(data28 && typeof data28 == "object" && !Array.isArray(data28)){
if(data28.status === undefined){
const err73 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
if(data28.candidates === undefined){
const err74 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/required",keyword:"required",params:{missingProperty: "candidates"},message:"must have required property '"+"candidates"+"'"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
if(data28.reasons === undefined){
const err75 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
if(data28.status !== undefined){
if("unknown" !== data28.status){
const err76 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/status",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/status/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
if(data28.candidates !== undefined){
let data34 = data28.candidates;
if(Array.isArray(data34)){
const len1 = data34.length;
for(let i1=0; i1<len1; i1++){
if(typeof data34[i1] !== "string"){
const err77 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/candidates/" + i1,schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
}
else {
const err78 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/candidates",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
if(data28.reasons !== undefined){
let data36 = data28.reasons;
if(Array.isArray(data36)){
if(data36.length < 1){
const err79 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
const len2 = data36.length;
for(let i2=0; i2<len2; i2++){
let data37 = data36[i2];
if(data37 && typeof data37 == "object" && !Array.isArray(data37)){
if(data37.code === undefined){
const err80 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i2,schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
if(data37.code !== undefined){
let data38 = data37.code;
if(typeof data38 === "string"){
if(func1(data38) < 1){
const err81 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i2+"/code",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
else {
const err82 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i2+"/code",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
if(data37.subject !== undefined){
if(typeof data37.subject !== "string"){
const err83 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i2+"/subject",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
if(data37.message !== undefined){
if(typeof data37.message !== "string"){
const err84 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i2+"/message",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
}
else {
const err85 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons/" + i2,schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
}
else {
const err86 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band/reasons",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
}
else {
const err87 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
var _valid0 = _errs68 === errors;
if(_valid0 && valid10){
valid10 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid10 = true;
passing0 = 1;
if(props1 !== true){
props1 = true;
}
}
}
if(!valid10){
const err88 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/band",schemaPath:"#/properties/rules/additionalProperties/properties/band/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
else {
errors = _errs57;
if(vErrors !== null){
if(_errs57){
vErrors.length = _errs57;
}
else {
vErrors = null;
}
}
}
}
if(data26.disposition !== undefined){
let data41 = data26.disposition;
if(!((((data41 === "matched") || (data41 === "unmatched")) || (data41 === "held")) || (data41 === "fallback"))){
const err89 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1")+"/disposition",schemaPath:"#/properties/rules/additionalProperties/properties/disposition/enum",keyword:"enum",params:{allowedValues: schema31.properties.rules.additionalProperties.properties.disposition.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
}
else {
const err90 = {instancePath:instancePath+"/rules/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/rules/additionalProperties/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
}
else {
const err91 = {instancePath:instancePath+"/rules",schemaPath:"#/properties/rules/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
}
if(data.held !== undefined){
let data42 = data.held;
if(Array.isArray(data42)){
const len3 = data42.length;
for(let i3=0; i3<len3; i3++){
let data43 = data42[i3];
if(data43 && typeof data43 == "object" && !Array.isArray(data43)){
if(data43.rule === undefined){
const err92 = {instancePath:instancePath+"/held/" + i3,schemaPath:"#/properties/held/items/required",keyword:"required",params:{missingProperty: "rule"},message:"must have required property '"+"rule"+"'"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if(data43.reasons === undefined){
const err93 = {instancePath:instancePath+"/held/" + i3,schemaPath:"#/properties/held/items/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
for(const key4 in data43){
if(!((key4 === "rule") || (key4 === "reasons"))){
const err94 = {instancePath:instancePath+"/held/" + i3,schemaPath:"#/properties/held/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
}
if(data43.rule !== undefined){
if(typeof data43.rule !== "string"){
const err95 = {instancePath:instancePath+"/held/" + i3+"/rule",schemaPath:"#/properties/held/items/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
}
if(data43.reasons !== undefined){
let data45 = data43.reasons;
if(Array.isArray(data45)){
if(data45.length < 1){
const err96 = {instancePath:instancePath+"/held/" + i3+"/reasons",schemaPath:"#/properties/held/items/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
const len4 = data45.length;
for(let i4=0; i4<len4; i4++){
let data46 = data45[i4];
if(data46 && typeof data46 == "object" && !Array.isArray(data46)){
if(data46.code === undefined){
const err97 = {instancePath:instancePath+"/held/" + i3+"/reasons/" + i4,schemaPath:"#/properties/held/items/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
if(data46.code !== undefined){
let data47 = data46.code;
if(typeof data47 === "string"){
if(func1(data47) < 1){
const err98 = {instancePath:instancePath+"/held/" + i3+"/reasons/" + i4+"/code",schemaPath:"#/properties/held/items/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
}
else {
const err99 = {instancePath:instancePath+"/held/" + i3+"/reasons/" + i4+"/code",schemaPath:"#/properties/held/items/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
}
if(data46.subject !== undefined){
if(typeof data46.subject !== "string"){
const err100 = {instancePath:instancePath+"/held/" + i3+"/reasons/" + i4+"/subject",schemaPath:"#/properties/held/items/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
}
if(data46.message !== undefined){
if(typeof data46.message !== "string"){
const err101 = {instancePath:instancePath+"/held/" + i3+"/reasons/" + i4+"/message",schemaPath:"#/properties/held/items/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
}
}
else {
const err102 = {instancePath:instancePath+"/held/" + i3+"/reasons/" + i4,schemaPath:"#/properties/held/items/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
}
}
else {
const err103 = {instancePath:instancePath+"/held/" + i3+"/reasons",schemaPath:"#/properties/held/items/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
}
}
else {
const err104 = {instancePath:instancePath+"/held/" + i3,schemaPath:"#/properties/held/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
}
}
else {
const err105 = {instancePath:instancePath+"/held",schemaPath:"#/properties/held/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
if(data.operations !== undefined){
let data50 = data.operations;
if(Array.isArray(data50)){
const len5 = data50.length;
for(let i5=0; i5<len5; i5++){
let data51 = data50[i5];
const _errs111 = errors;
let valid27 = false;
let passing1 = null;
const _errs112 = errors;
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.kind === undefined){
const err106 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/0/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
if(data51.name === undefined){
const err107 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/0/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
if(data51.definition === undefined){
const err108 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/0/required",keyword:"required",params:{missingProperty: "definition"},message:"must have required property '"+"definition"+"'"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
for(const key5 in data51){
if(!((((key5 === "kind") || (key5 === "rule")) || (key5 === "name")) || (key5 === "definition"))){
const err109 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
}
if(data51.kind !== undefined){
if("label.ensure" !== data51.kind){
const err110 = {instancePath:instancePath+"/operations/" + i5+"/kind",schemaPath:"#/properties/operations/items/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "label.ensure"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err110];
}
else {
vErrors.push(err110);
}
errors++;
}
}
if(data51.rule !== undefined){
if(typeof data51.rule !== "string"){
const err111 = {instancePath:instancePath+"/operations/" + i5+"/rule",schemaPath:"#/properties/operations/items/oneOf/0/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err111];
}
else {
vErrors.push(err111);
}
errors++;
}
}
if(data51.name !== undefined){
if(typeof data51.name !== "string"){
const err112 = {instancePath:instancePath+"/operations/" + i5+"/name",schemaPath:"#/properties/operations/items/oneOf/0/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err112];
}
else {
vErrors.push(err112);
}
errors++;
}
}
if(data51.definition !== undefined){
let data55 = data51.definition;
if(data55 && typeof data55 == "object" && !Array.isArray(data55)){
if(data55.color === undefined){
const err113 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/required",keyword:"required",params:{missingProperty: "color"},message:"must have required property '"+"color"+"'"};
if(vErrors === null){
vErrors = [err113];
}
else {
vErrors.push(err113);
}
errors++;
}
if(data55.description === undefined){
const err114 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/required",keyword:"required",params:{missingProperty: "description"},message:"must have required property '"+"description"+"'"};
if(vErrors === null){
vErrors = [err114];
}
else {
vErrors.push(err114);
}
errors++;
}
for(const key6 in data55){
if(!((key6 === "color") || (key6 === "description"))){
const err115 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err115];
}
else {
vErrors.push(err115);
}
errors++;
}
}
if(data55.color !== undefined){
let data56 = data55.color;
if(typeof data56 === "string"){
if(!pattern3.test(data56)){
const err116 = {instancePath:instancePath+"/operations/" + i5+"/definition/color",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/properties/color/pattern",keyword:"pattern",params:{pattern: "^[0-9a-fA-F]{6}$"},message:"must match pattern \""+"^[0-9a-fA-F]{6}$"+"\""};
if(vErrors === null){
vErrors = [err116];
}
else {
vErrors.push(err116);
}
errors++;
}
}
else {
const err117 = {instancePath:instancePath+"/operations/" + i5+"/definition/color",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err117];
}
else {
vErrors.push(err117);
}
errors++;
}
}
if(data55.description !== undefined){
let data57 = data55.description;
if(typeof data57 === "string"){
if(func1(data57) > 100){
const err118 = {instancePath:instancePath+"/operations/" + i5+"/definition/description",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/properties/description/maxLength",keyword:"maxLength",params:{limit: 100},message:"must NOT have more than 100 characters"};
if(vErrors === null){
vErrors = [err118];
}
else {
vErrors.push(err118);
}
errors++;
}
}
else {
const err119 = {instancePath:instancePath+"/operations/" + i5+"/definition/description",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err119];
}
else {
vErrors.push(err119);
}
errors++;
}
}
}
else {
const err120 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/0/properties/definition/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err120];
}
else {
vErrors.push(err120);
}
errors++;
}
}
}
else {
const err121 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err121];
}
else {
vErrors.push(err121);
}
errors++;
}
var _valid1 = _errs112 === errors;
if(_valid1){
valid27 = true;
passing1 = 0;
var props2 = true;
}
const _errs127 = errors;
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.kind === undefined){
const err122 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err122];
}
else {
vErrors.push(err122);
}
errors++;
}
if(data51.name === undefined){
const err123 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/1/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err123];
}
else {
vErrors.push(err123);
}
errors++;
}
if(data51.definition === undefined){
const err124 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/1/required",keyword:"required",params:{missingProperty: "definition"},message:"must have required property '"+"definition"+"'"};
if(vErrors === null){
vErrors = [err124];
}
else {
vErrors.push(err124);
}
errors++;
}
for(const key7 in data51){
if(!((((key7 === "kind") || (key7 === "rule")) || (key7 === "name")) || (key7 === "definition"))){
const err125 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key7},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err125];
}
else {
vErrors.push(err125);
}
errors++;
}
}
if(data51.kind !== undefined){
if("label.sync" !== data51.kind){
const err126 = {instancePath:instancePath+"/operations/" + i5+"/kind",schemaPath:"#/properties/operations/items/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "label.sync"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err126];
}
else {
vErrors.push(err126);
}
errors++;
}
}
if(data51.rule !== undefined){
if(typeof data51.rule !== "string"){
const err127 = {instancePath:instancePath+"/operations/" + i5+"/rule",schemaPath:"#/properties/operations/items/oneOf/1/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err127];
}
else {
vErrors.push(err127);
}
errors++;
}
}
if(data51.name !== undefined){
if(typeof data51.name !== "string"){
const err128 = {instancePath:instancePath+"/operations/" + i5+"/name",schemaPath:"#/properties/operations/items/oneOf/1/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err128];
}
else {
vErrors.push(err128);
}
errors++;
}
}
if(data51.definition !== undefined){
let data61 = data51.definition;
if(data61 && typeof data61 == "object" && !Array.isArray(data61)){
if(data61.color === undefined){
const err129 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/required",keyword:"required",params:{missingProperty: "color"},message:"must have required property '"+"color"+"'"};
if(vErrors === null){
vErrors = [err129];
}
else {
vErrors.push(err129);
}
errors++;
}
if(data61.description === undefined){
const err130 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/required",keyword:"required",params:{missingProperty: "description"},message:"must have required property '"+"description"+"'"};
if(vErrors === null){
vErrors = [err130];
}
else {
vErrors.push(err130);
}
errors++;
}
for(const key8 in data61){
if(!((key8 === "color") || (key8 === "description"))){
const err131 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key8},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err131];
}
else {
vErrors.push(err131);
}
errors++;
}
}
if(data61.color !== undefined){
let data62 = data61.color;
if(typeof data62 === "string"){
if(!pattern3.test(data62)){
const err132 = {instancePath:instancePath+"/operations/" + i5+"/definition/color",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/properties/color/pattern",keyword:"pattern",params:{pattern: "^[0-9a-fA-F]{6}$"},message:"must match pattern \""+"^[0-9a-fA-F]{6}$"+"\""};
if(vErrors === null){
vErrors = [err132];
}
else {
vErrors.push(err132);
}
errors++;
}
}
else {
const err133 = {instancePath:instancePath+"/operations/" + i5+"/definition/color",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/properties/color/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err133];
}
else {
vErrors.push(err133);
}
errors++;
}
}
if(data61.description !== undefined){
let data63 = data61.description;
if(typeof data63 === "string"){
if(func1(data63) > 100){
const err134 = {instancePath:instancePath+"/operations/" + i5+"/definition/description",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/properties/description/maxLength",keyword:"maxLength",params:{limit: 100},message:"must NOT have more than 100 characters"};
if(vErrors === null){
vErrors = [err134];
}
else {
vErrors.push(err134);
}
errors++;
}
}
else {
const err135 = {instancePath:instancePath+"/operations/" + i5+"/definition/description",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/properties/description/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err135];
}
else {
vErrors.push(err135);
}
errors++;
}
}
}
else {
const err136 = {instancePath:instancePath+"/operations/" + i5+"/definition",schemaPath:"#/properties/operations/items/oneOf/1/properties/definition/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err136];
}
else {
vErrors.push(err136);
}
errors++;
}
}
}
else {
const err137 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err137];
}
else {
vErrors.push(err137);
}
errors++;
}
var _valid1 = _errs127 === errors;
if(_valid1 && valid27){
valid27 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid27 = true;
passing1 = 1;
if(props2 !== true){
props2 = true;
}
}
const _errs142 = errors;
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.kind === undefined){
const err138 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/2/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err138];
}
else {
vErrors.push(err138);
}
errors++;
}
if(data51.rule === undefined){
const err139 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/2/required",keyword:"required",params:{missingProperty: "rule"},message:"must have required property '"+"rule"+"'"};
if(vErrors === null){
vErrors = [err139];
}
else {
vErrors.push(err139);
}
errors++;
}
if(data51.name === undefined){
const err140 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/2/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err140];
}
else {
vErrors.push(err140);
}
errors++;
}
for(const key9 in data51){
if(!(((key9 === "kind") || (key9 === "rule")) || (key9 === "name"))){
const err141 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err141];
}
else {
vErrors.push(err141);
}
errors++;
}
}
if(data51.kind !== undefined){
if("label.add" !== data51.kind){
const err142 = {instancePath:instancePath+"/operations/" + i5+"/kind",schemaPath:"#/properties/operations/items/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "label.add"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err142];
}
else {
vErrors.push(err142);
}
errors++;
}
}
if(data51.rule !== undefined){
if(typeof data51.rule !== "string"){
const err143 = {instancePath:instancePath+"/operations/" + i5+"/rule",schemaPath:"#/properties/operations/items/oneOf/2/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err143];
}
else {
vErrors.push(err143);
}
errors++;
}
}
if(data51.name !== undefined){
if(typeof data51.name !== "string"){
const err144 = {instancePath:instancePath+"/operations/" + i5+"/name",schemaPath:"#/properties/operations/items/oneOf/2/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err144];
}
else {
vErrors.push(err144);
}
errors++;
}
}
}
else {
const err145 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err145];
}
else {
vErrors.push(err145);
}
errors++;
}
var _valid1 = _errs142 === errors;
if(_valid1 && valid27){
valid27 = false;
passing1 = [passing1, 2];
}
else {
if(_valid1){
valid27 = true;
passing1 = 2;
if(props2 !== true){
props2 = true;
}
}
const _errs150 = errors;
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.kind === undefined){
const err146 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/3/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err146];
}
else {
vErrors.push(err146);
}
errors++;
}
if(data51.rule === undefined){
const err147 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/3/required",keyword:"required",params:{missingProperty: "rule"},message:"must have required property '"+"rule"+"'"};
if(vErrors === null){
vErrors = [err147];
}
else {
vErrors.push(err147);
}
errors++;
}
if(data51.name === undefined){
const err148 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/3/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err148];
}
else {
vErrors.push(err148);
}
errors++;
}
for(const key10 in data51){
if(!(((key10 === "kind") || (key10 === "rule")) || (key10 === "name"))){
const err149 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key10},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err149];
}
else {
vErrors.push(err149);
}
errors++;
}
}
if(data51.kind !== undefined){
if("label.remove" !== data51.kind){
const err150 = {instancePath:instancePath+"/operations/" + i5+"/kind",schemaPath:"#/properties/operations/items/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "label.remove"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err150];
}
else {
vErrors.push(err150);
}
errors++;
}
}
if(data51.rule !== undefined){
if(typeof data51.rule !== "string"){
const err151 = {instancePath:instancePath+"/operations/" + i5+"/rule",schemaPath:"#/properties/operations/items/oneOf/3/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err151];
}
else {
vErrors.push(err151);
}
errors++;
}
}
if(data51.name !== undefined){
if(typeof data51.name !== "string"){
const err152 = {instancePath:instancePath+"/operations/" + i5+"/name",schemaPath:"#/properties/operations/items/oneOf/3/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err152];
}
else {
vErrors.push(err152);
}
errors++;
}
}
}
else {
const err153 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err153];
}
else {
vErrors.push(err153);
}
errors++;
}
var _valid1 = _errs150 === errors;
if(_valid1 && valid27){
valid27 = false;
passing1 = [passing1, 3];
}
else {
if(_valid1){
valid27 = true;
passing1 = 3;
if(props2 !== true){
props2 = true;
}
}
const _errs158 = errors;
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.kind === undefined){
const err154 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err154];
}
else {
vErrors.push(err154);
}
errors++;
}
if(data51.rule === undefined){
const err155 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/required",keyword:"required",params:{missingProperty: "rule"},message:"must have required property '"+"rule"+"'"};
if(vErrors === null){
vErrors = [err155];
}
else {
vErrors.push(err155);
}
errors++;
}
if(data51.group === undefined){
const err156 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/required",keyword:"required",params:{missingProperty: "group"},message:"must have required property '"+"group"+"'"};
if(vErrors === null){
vErrors = [err156];
}
else {
vErrors.push(err156);
}
errors++;
}
if(data51.members === undefined){
const err157 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/required",keyword:"required",params:{missingProperty: "members"},message:"must have required property '"+"members"+"'"};
if(vErrors === null){
vErrors = [err157];
}
else {
vErrors.push(err157);
}
errors++;
}
if(data51.selected === undefined){
const err158 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/required",keyword:"required",params:{missingProperty: "selected"},message:"must have required property '"+"selected"+"'"};
if(vErrors === null){
vErrors = [err158];
}
else {
vErrors.push(err158);
}
errors++;
}
for(const key11 in data51){
if(!(((((key11 === "kind") || (key11 === "rule")) || (key11 === "group")) || (key11 === "members")) || (key11 === "selected"))){
const err159 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key11},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err159];
}
else {
vErrors.push(err159);
}
errors++;
}
}
if(data51.kind !== undefined){
if("label.select" !== data51.kind){
const err160 = {instancePath:instancePath+"/operations/" + i5+"/kind",schemaPath:"#/properties/operations/items/oneOf/4/properties/kind/const",keyword:"const",params:{allowedValue: "label.select"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err160];
}
else {
vErrors.push(err160);
}
errors++;
}
}
if(data51.rule !== undefined){
if(typeof data51.rule !== "string"){
const err161 = {instancePath:instancePath+"/operations/" + i5+"/rule",schemaPath:"#/properties/operations/items/oneOf/4/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err161];
}
else {
vErrors.push(err161);
}
errors++;
}
}
if(data51.group !== undefined){
if(typeof data51.group !== "string"){
const err162 = {instancePath:instancePath+"/operations/" + i5+"/group",schemaPath:"#/properties/operations/items/oneOf/4/properties/group/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err162];
}
else {
vErrors.push(err162);
}
errors++;
}
}
if(data51.members !== undefined){
let data73 = data51.members;
if(Array.isArray(data73)){
const len6 = data73.length;
for(let i6=0; i6<len6; i6++){
if(typeof data73[i6] !== "string"){
const err163 = {instancePath:instancePath+"/operations/" + i5+"/members/" + i6,schemaPath:"#/properties/operations/items/oneOf/4/properties/members/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err163];
}
else {
vErrors.push(err163);
}
errors++;
}
}
}
else {
const err164 = {instancePath:instancePath+"/operations/" + i5+"/members",schemaPath:"#/properties/operations/items/oneOf/4/properties/members/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err164];
}
else {
vErrors.push(err164);
}
errors++;
}
}
if(data51.selected !== undefined){
if(typeof data51.selected !== "string"){
const err165 = {instancePath:instancePath+"/operations/" + i5+"/selected",schemaPath:"#/properties/operations/items/oneOf/4/properties/selected/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err165];
}
else {
vErrors.push(err165);
}
errors++;
}
}
}
else {
const err166 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/4/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err166];
}
else {
vErrors.push(err166);
}
errors++;
}
var _valid1 = _errs158 === errors;
if(_valid1 && valid27){
valid27 = false;
passing1 = [passing1, 4];
}
else {
if(_valid1){
valid27 = true;
passing1 = 4;
if(props2 !== true){
props2 = true;
}
}
const _errs172 = errors;
if(data51 && typeof data51 == "object" && !Array.isArray(data51)){
if(data51.kind === undefined){
const err167 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err167];
}
else {
vErrors.push(err167);
}
errors++;
}
if(data51.rule === undefined){
const err168 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/required",keyword:"required",params:{missingProperty: "rule"},message:"must have required property '"+"rule"+"'"};
if(vErrors === null){
vErrors = [err168];
}
else {
vErrors.push(err168);
}
errors++;
}
if(data51.mode === undefined){
const err169 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/required",keyword:"required",params:{missingProperty: "mode"},message:"must have required property '"+"mode"+"'"};
if(vErrors === null){
vErrors = [err169];
}
else {
vErrors.push(err169);
}
errors++;
}
if(data51.trigger === undefined){
const err170 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/required",keyword:"required",params:{missingProperty: "trigger"},message:"must have required property '"+"trigger"+"'"};
if(vErrors === null){
vErrors = [err170];
}
else {
vErrors.push(err170);
}
errors++;
}
if(data51.body === undefined){
const err171 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/required",keyword:"required",params:{missingProperty: "body"},message:"must have required property '"+"body"+"'"};
if(vErrors === null){
vErrors = [err171];
}
else {
vErrors.push(err171);
}
errors++;
}
for(const key12 in data51){
if(!((((((key12 === "kind") || (key12 === "rule")) || (key12 === "mode")) || (key12 === "trigger")) || (key12 === "body")) || (key12 === "occasionId"))){
const err172 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key12},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err172];
}
else {
vErrors.push(err172);
}
errors++;
}
}
if(data51.kind !== undefined){
if("comment.reconcile" !== data51.kind){
const err173 = {instancePath:instancePath+"/operations/" + i5+"/kind",schemaPath:"#/properties/operations/items/oneOf/5/properties/kind/const",keyword:"const",params:{allowedValue: "comment.reconcile"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err173];
}
else {
vErrors.push(err173);
}
errors++;
}
}
if(data51.rule !== undefined){
if(typeof data51.rule !== "string"){
const err174 = {instancePath:instancePath+"/operations/" + i5+"/rule",schemaPath:"#/properties/operations/items/oneOf/5/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err174];
}
else {
vErrors.push(err174);
}
errors++;
}
}
if(data51.mode !== undefined){
let data78 = data51.mode;
if(!((((data78 === "create") || (data78 === "once")) || (data78 === "upsert")) || (data78 === "once-per-transition"))){
const err175 = {instancePath:instancePath+"/operations/" + i5+"/mode",schemaPath:"#/properties/operations/items/oneOf/5/properties/mode/enum",keyword:"enum",params:{allowedValues: schema31.properties.operations.items.oneOf[5].properties.mode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err175];
}
else {
vErrors.push(err175);
}
errors++;
}
}
if(data51.trigger !== undefined){
let data79 = data51.trigger;
if(!(((data79 === "always") || (data79 === "matched")) || (data79 === "band-changed"))){
const err176 = {instancePath:instancePath+"/operations/" + i5+"/trigger",schemaPath:"#/properties/operations/items/oneOf/5/properties/trigger/enum",keyword:"enum",params:{allowedValues: schema31.properties.operations.items.oneOf[5].properties.trigger.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err176];
}
else {
vErrors.push(err176);
}
errors++;
}
}
if(data51.body !== undefined){
if(typeof data51.body !== "string"){
const err177 = {instancePath:instancePath+"/operations/" + i5+"/body",schemaPath:"#/properties/operations/items/oneOf/5/properties/body/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err177];
}
else {
vErrors.push(err177);
}
errors++;
}
}
if(data51.occasionId !== undefined){
if(typeof data51.occasionId !== "string"){
const err178 = {instancePath:instancePath+"/operations/" + i5+"/occasionId",schemaPath:"#/properties/operations/items/oneOf/5/properties/occasionId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err178];
}
else {
vErrors.push(err178);
}
errors++;
}
}
}
else {
const err179 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf/5/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err179];
}
else {
vErrors.push(err179);
}
errors++;
}
var _valid1 = _errs172 === errors;
if(_valid1 && valid27){
valid27 = false;
passing1 = [passing1, 5];
}
else {
if(_valid1){
valid27 = true;
passing1 = 5;
if(props2 !== true){
props2 = true;
}
}
}
}
}
}
}
if(!valid27){
const err180 = {instancePath:instancePath+"/operations/" + i5,schemaPath:"#/properties/operations/items/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err180];
}
else {
vErrors.push(err180);
}
errors++;
}
else {
errors = _errs111;
if(vErrors !== null){
if(_errs111){
vErrors.length = _errs111;
}
else {
vErrors = null;
}
}
}
}
}
else {
const err181 = {instancePath:instancePath+"/operations",schemaPath:"#/properties/operations/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err181];
}
else {
vErrors.push(err181);
}
errors++;
}
}
if(data.preconditions !== undefined){
let data82 = data.preconditions;
if(data82 && typeof data82 == "object" && !Array.isArray(data82)){
for(const key13 in data82){
if(!(((key13 === "head") || (key13 === "base")) || (key13 === "providerStateId"))){
const err182 = {instancePath:instancePath+"/preconditions",schemaPath:"#/properties/preconditions/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key13},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err182];
}
else {
vErrors.push(err182);
}
errors++;
}
}
if(data82.head !== undefined){
if(typeof data82.head !== "string"){
const err183 = {instancePath:instancePath+"/preconditions/head",schemaPath:"#/properties/preconditions/properties/head/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err183];
}
else {
vErrors.push(err183);
}
errors++;
}
}
if(data82.base !== undefined){
if(typeof data82.base !== "string"){
const err184 = {instancePath:instancePath+"/preconditions/base",schemaPath:"#/properties/preconditions/properties/base/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err184];
}
else {
vErrors.push(err184);
}
errors++;
}
}
if(data82.providerStateId !== undefined){
if(typeof data82.providerStateId !== "string"){
const err185 = {instancePath:instancePath+"/preconditions/providerStateId",schemaPath:"#/properties/preconditions/properties/providerStateId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err185];
}
else {
vErrors.push(err185);
}
errors++;
}
}
}
else {
const err186 = {instancePath:instancePath+"/preconditions",schemaPath:"#/properties/preconditions/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err186];
}
else {
vErrors.push(err186);
}
errors++;
}
}
}
else {
const err187 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err187];
}
else {
vErrors.push(err187);
}
errors++;
}
validate129.errors = vErrors;
return errors === 0;
}
validate129.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

exports.query = validate132;
const schema33 = {"type":"object","properties":{"kind":{"const":"diffdevil.query"},"schemaVersion":{"const":"1.0"},"semantics":{"type":"object","properties":{"language":{"const":"diffdevil-expr/1"},"numbers":{"const":"diffdevil-number/1"},"replacementLines":{"const":"replacement-lines-v1"},"paths":{"const":"diffdevil-glob/1"},"presets":{"type":"array","items":{"type":"string"}},"limits":{"type":"string"}},"additionalProperties":true,"required":["language","numbers","replacementLines","paths"]},"reportId":{"type":"string"},"source":{"type":"object","properties":{"kind":{"enum":["git","unified-diff","github-api"]},"comparisonId":{"type":"string","minLength":1},"base":{"type":"string"},"head":{"type":"string"},"comparison":{"enum":["three-dot","direct","worktree","staged","supplied"]},"repository":{"type":"string"},"pullRequest":{"type":"integer","minimum":0,"maximum":9007199254740991}},"additionalProperties":true,"required":["kind","comparisonId"]},"value":{"$ref":"urn:diffdevil:values:1#/$defs/value"},"evidence":{"type":"array","items":{"type":"object","properties":{"code":{"type":"string","minLength":1},"subject":{"type":"string"},"message":{"type":"string"}},"additionalProperties":true,"required":["code"]}}},"additionalProperties":true,"required":["kind","schemaVersion","semantics","value","evidence"],"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:diffdevil:query:1","title":"diffdevil query result 1.0"};

function validate133(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate133.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.numericType === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "numericType"},message:"must have required property '"+"numericType"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.measurement === undefined){
const err2 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "measurement"},message:"must have required property '"+"measurement"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "kind") || (key0 === "numericType")) || (key0 === "measurement"))){
const err3 = {instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.kind !== undefined){
if("number" !== data.kind){
const err4 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "number"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.numericType !== undefined){
let data1 = data.numericType;
if(!((data1 === "integer") || (data1 === "float"))){
const err5 = {instancePath:instancePath+"/numericType",schemaPath:"#/oneOf/0/properties/numericType/enum",keyword:"enum",params:{allowedValues: schema20.oneOf[0].properties.numericType.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.measurement !== undefined){
if(!(validate54(data.measurement, {instancePath:instancePath+"/measurement",parentData:data,parentDataProperty:"measurement",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props1 = true;
}
const _errs7 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.decision === undefined){
const err8 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "decision"},message:"must have required property '"+"decision"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
for(const key1 in data){
if(!((key1 === "kind") || (key1 === "decision"))){
const err9 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.kind !== undefined){
if("boolean" !== data.kind){
const err10 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "boolean"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.decision !== undefined){
if(!(validate56(data.decision, {instancePath:instancePath+"/decision",parentData:data,parentDataProperty:"decision",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
}
}
else {
const err11 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props1 !== true){
props1 = true;
}
}
const _errs12 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err12 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.value === undefined){
const err13 = {instancePath,schemaPath:"#/oneOf/2/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
for(const key2 in data){
if(!((key2 === "kind") || (key2 === "value"))){
const err14 = {instancePath,schemaPath:"#/oneOf/2/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.kind !== undefined){
if("string" !== data.kind){
const err15 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/2/properties/kind/const",keyword:"const",params:{allowedValue: "string"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.value !== undefined){
if(typeof data.value !== "string"){
const err16 = {instancePath:instancePath+"/value",schemaPath:"#/oneOf/2/properties/value/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath,schemaPath:"#/oneOf/2/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
var _valid0 = _errs12 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props1 !== true){
props1 = true;
}
}
const _errs18 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err18 = {instancePath,schemaPath:"#/oneOf/3/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
for(const key3 in data){
if(!(key3 === "kind")){
const err19 = {instancePath,schemaPath:"#/oneOf/3/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.kind !== undefined){
if("null" !== data.kind){
const err20 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/3/properties/kind/const",keyword:"const",params:{allowedValue: "null"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
}
else {
const err21 = {instancePath,schemaPath:"#/oneOf/3/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
var _valid0 = _errs18 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props1 !== true){
props1 = true;
}
}
const _errs22 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err22 = {instancePath,schemaPath:"#/oneOf/4/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
for(const key4 in data){
if(!(key4 === "kind")){
const err23 = {instancePath,schemaPath:"#/oneOf/4/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.kind !== undefined){
if("missing" !== data.kind){
const err24 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/4/properties/kind/const",keyword:"const",params:{allowedValue: "missing"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
}
else {
const err25 = {instancePath,schemaPath:"#/oneOf/4/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid0 = _errs22 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props1 !== true){
props1 = true;
}
}
const _errs26 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err26 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data.type === undefined){
const err27 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "type"},message:"must have required property '"+"type"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data.reasons === undefined){
const err28 = {instancePath,schemaPath:"#/oneOf/5/required",keyword:"required",params:{missingProperty: "reasons"},message:"must have required property '"+"reasons"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
for(const key5 in data){
if(!(((key5 === "kind") || (key5 === "type")) || (key5 === "reasons"))){
const err29 = {instancePath,schemaPath:"#/oneOf/5/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data.kind !== undefined){
if("unknown" !== data.kind){
const err30 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/5/properties/kind/const",keyword:"const",params:{allowedValue: "unknown"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.type !== undefined){
if(!(validate58(data.type, {instancePath:instancePath+"/type",parentData:data,parentDataProperty:"type",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate58.errors : vErrors.concat(validate58.errors);
errors = vErrors.length;
}
}
if(data.reasons !== undefined){
let data11 = data.reasons;
if(Array.isArray(data11)){
if(data11.length < 1){
const err31 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/5/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
const len0 = data11.length;
for(let i0=0; i0<len0; i0++){
let data12 = data11[i0];
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
if(data12.code === undefined){
const err32 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/5/properties/reasons/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data12.code !== undefined){
let data13 = data12.code;
if(typeof data13 === "string"){
if(func1(data13) < 1){
const err33 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/5/properties/reasons/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/reasons/" + i0+"/code",schemaPath:"#/oneOf/5/properties/reasons/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data12.subject !== undefined){
if(typeof data12.subject !== "string"){
const err35 = {instancePath:instancePath+"/reasons/" + i0+"/subject",schemaPath:"#/oneOf/5/properties/reasons/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data12.message !== undefined){
if(typeof data12.message !== "string"){
const err36 = {instancePath:instancePath+"/reasons/" + i0+"/message",schemaPath:"#/oneOf/5/properties/reasons/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
}
else {
const err37 = {instancePath:instancePath+"/reasons/" + i0,schemaPath:"#/oneOf/5/properties/reasons/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
}
else {
const err38 = {instancePath:instancePath+"/reasons",schemaPath:"#/oneOf/5/properties/reasons/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
else {
const err39 = {instancePath,schemaPath:"#/oneOf/5/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
var _valid0 = _errs26 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props1 !== true){
props1 = true;
}
}
const _errs42 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err40 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data.fields === undefined){
const err41 = {instancePath,schemaPath:"#/oneOf/6/required",keyword:"required",params:{missingProperty: "fields"},message:"must have required property '"+"fields"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
for(const key6 in data){
if(!((key6 === "kind") || (key6 === "fields"))){
const err42 = {instancePath,schemaPath:"#/oneOf/6/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data.kind !== undefined){
if("record" !== data.kind){
const err43 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/6/properties/kind/const",keyword:"const",params:{allowedValue: "record"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data.fields !== undefined){
let data17 = data.fields;
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
for(const key7 in data17){
const _errs48 = errors;
const _errs49 = errors;
const _errs50 = errors;
if(!(((key7 === "__proto__") || (key7 === "constructor")) || (key7 === "prototype"))){
const err44 = {};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
var valid12 = _errs50 === errors;
if(valid12){
const err45 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/propertyNames/not",keyword:"not",params:{},message:"must NOT be valid",propertyName:key7};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
else {
errors = _errs49;
if(vErrors !== null){
if(_errs49){
vErrors.length = _errs49;
}
else {
vErrors = null;
}
}
}
if(typeof key7 === "string"){
if(func1(key7) < 1){
const err46 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key7};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
var valid11 = _errs48 === errors;
if(!valid11){
const err47 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/propertyNames",keyword:"propertyNames",params:{propertyName: key7},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
for(const key8 in data17){
if(!(validate53(data17[key8], {instancePath:instancePath+"/fields/" + key8.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data17,parentDataProperty:key8,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
}
}
else {
const err48 = {instancePath:instancePath+"/fields",schemaPath:"#/oneOf/6/properties/fields/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
}
else {
const err49 = {instancePath,schemaPath:"#/oneOf/6/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
var _valid0 = _errs42 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props1 !== true){
props1 = true;
}
}
const _errs53 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err50 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data.items === undefined){
const err51 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "items"},message:"must have required property '"+"items"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data.unseen === undefined){
const err52 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "unseen"},message:"must have required property '"+"unseen"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data.order === undefined){
const err53 = {instancePath,schemaPath:"#/oneOf/7/required",keyword:"required",params:{missingProperty: "order"},message:"must have required property '"+"order"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
for(const key9 in data){
if(!((((((key9 === "kind") || (key9 === "items")) || (key9 === "unseen")) || (key9 === "order")) || (key9 === "notes")) || (key9 === "cardinality"))){
const err54 = {instancePath,schemaPath:"#/oneOf/7/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data.kind !== undefined){
if("collection" !== data.kind){
const err55 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/7/properties/kind/const",keyword:"const",params:{allowedValue: "collection"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data.items !== undefined){
let data20 = data.items;
if(Array.isArray(data20)){
const len1 = data20.length;
for(let i1=0; i1<len1; i1++){
let data21 = data20[i1];
if(data21 && typeof data21 == "object" && !Array.isArray(data21)){
if(data21.membership === undefined){
const err56 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/required",keyword:"required",params:{missingProperty: "membership"},message:"must have required property '"+"membership"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data21.value === undefined){
const err57 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
for(const key10 in data21){
if(!((key10 === "membership") || (key10 === "value"))){
const err58 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key10},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data21.membership !== undefined){
let data22 = data21.membership;
if(!((data22 === "definite") || (data22 === "possible"))){
const err59 = {instancePath:instancePath+"/items/" + i1+"/membership",schemaPath:"#/oneOf/7/properties/items/items/properties/membership/enum",keyword:"enum",params:{allowedValues: schema20.oneOf[7].properties.items.items.properties.membership.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data21.value !== undefined){
if(!(validate53(data21.value, {instancePath:instancePath+"/items/" + i1+"/value",parentData:data21,parentDataProperty:"value",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
errors = vErrors.length;
}
}
}
else {
const err60 = {instancePath:instancePath+"/items/" + i1,schemaPath:"#/oneOf/7/properties/items/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/items",schemaPath:"#/oneOf/7/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data.unseen !== undefined){
let data24 = data.unseen;
if(data24 && typeof data24 == "object" && !Array.isArray(data24)){
if(data24.possible === undefined){
const err62 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/required",keyword:"required",params:{missingProperty: "possible"},message:"must have required property '"+"possible"+"'"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
if(data24.minimum === undefined){
const err63 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/required",keyword:"required",params:{missingProperty: "minimum"},message:"must have required property '"+"minimum"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
for(const key11 in data24){
if(!(((key11 === "possible") || (key11 === "minimum")) || (key11 === "maximum"))){
const err64 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key11},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
}
if(data24.possible !== undefined){
if(typeof data24.possible !== "boolean"){
const err65 = {instancePath:instancePath+"/unseen/possible",schemaPath:"#/oneOf/7/properties/unseen/properties/possible/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data24.minimum !== undefined){
let data26 = data24.minimum;
if(!(((typeof data26 == "number") && (!(data26 % 1) && !isNaN(data26))) && (isFinite(data26)))){
const err66 = {instancePath:instancePath+"/unseen/minimum",schemaPath:"#/oneOf/7/properties/unseen/properties/minimum/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
if((typeof data26 == "number") && (isFinite(data26))){
if(data26 > 9007199254740991 || isNaN(data26)){
const err67 = {instancePath:instancePath+"/unseen/minimum",schemaPath:"#/oneOf/7/properties/unseen/properties/minimum/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(data26 < 0 || isNaN(data26)){
const err68 = {instancePath:instancePath+"/unseen/minimum",schemaPath:"#/oneOf/7/properties/unseen/properties/minimum/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
}
if(data24.maximum !== undefined){
let data27 = data24.maximum;
if(!(((typeof data27 == "number") && (!(data27 % 1) && !isNaN(data27))) && (isFinite(data27)))){
const err69 = {instancePath:instancePath+"/unseen/maximum",schemaPath:"#/oneOf/7/properties/unseen/properties/maximum/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
if((typeof data27 == "number") && (isFinite(data27))){
if(data27 > 9007199254740991 || isNaN(data27)){
const err70 = {instancePath:instancePath+"/unseen/maximum",schemaPath:"#/oneOf/7/properties/unseen/properties/maximum/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
if(data27 < 0 || isNaN(data27)){
const err71 = {instancePath:instancePath+"/unseen/maximum",schemaPath:"#/oneOf/7/properties/unseen/properties/maximum/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
}
}
else {
const err72 = {instancePath:instancePath+"/unseen",schemaPath:"#/oneOf/7/properties/unseen/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data.order !== undefined){
let data28 = data.order;
if(!((data28 === "known") || (data28 === "unknown"))){
const err73 = {instancePath:instancePath+"/order",schemaPath:"#/oneOf/7/properties/order/enum",keyword:"enum",params:{allowedValues: schema20.oneOf[7].properties.order.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
if(data.notes !== undefined){
let data29 = data.notes;
if(Array.isArray(data29)){
const len2 = data29.length;
for(let i2=0; i2<len2; i2++){
let data30 = data29[i2];
if(data30 && typeof data30 == "object" && !Array.isArray(data30)){
if(data30.code === undefined){
const err74 = {instancePath:instancePath+"/notes/" + i2,schemaPath:"#/oneOf/7/properties/notes/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
if(data30.code !== undefined){
let data31 = data30.code;
if(typeof data31 === "string"){
if(func1(data31) < 1){
const err75 = {instancePath:instancePath+"/notes/" + i2+"/code",schemaPath:"#/oneOf/7/properties/notes/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
else {
const err76 = {instancePath:instancePath+"/notes/" + i2+"/code",schemaPath:"#/oneOf/7/properties/notes/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
if(data30.subject !== undefined){
if(typeof data30.subject !== "string"){
const err77 = {instancePath:instancePath+"/notes/" + i2+"/subject",schemaPath:"#/oneOf/7/properties/notes/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data30.message !== undefined){
if(typeof data30.message !== "string"){
const err78 = {instancePath:instancePath+"/notes/" + i2+"/message",schemaPath:"#/oneOf/7/properties/notes/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
}
else {
const err79 = {instancePath:instancePath+"/notes/" + i2,schemaPath:"#/oneOf/7/properties/notes/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
}
else {
const err80 = {instancePath:instancePath+"/notes",schemaPath:"#/oneOf/7/properties/notes/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
if(data.cardinality !== undefined){
if(!(validate54(data.cardinality, {instancePath:instancePath+"/cardinality",parentData:data,parentDataProperty:"cardinality",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
}
}
else {
const err81 = {instancePath,schemaPath:"#/oneOf/7/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
var _valid0 = _errs53 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props1 !== true){
props1 = true;
}
}
}
}
}
}
}
}
}
if(!valid0){
const err82 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate133.errors = vErrors;
evaluated0.props = props1;
return errors === 0;
}
validate133.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate132(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="urn:diffdevil:query:1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate132.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.schemaVersion === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.semantics === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "semantics"},message:"must have required property '"+"semantics"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.value === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.evidence === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "evidence"},message:"must have required property '"+"evidence"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.kind !== undefined){
if("diffdevil.query" !== data.kind){
const err5 = {instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "diffdevil.query"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if("1.0" !== data.schemaVersion){
const err6 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.semantics !== undefined){
let data2 = data.semantics;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.language === undefined){
const err7 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "language"},message:"must have required property '"+"language"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data2.numbers === undefined){
const err8 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "numbers"},message:"must have required property '"+"numbers"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data2.replacementLines === undefined){
const err9 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "replacementLines"},message:"must have required property '"+"replacementLines"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data2.paths === undefined){
const err10 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/required",keyword:"required",params:{missingProperty: "paths"},message:"must have required property '"+"paths"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data2.language !== undefined){
if("diffdevil-expr/1" !== data2.language){
const err11 = {instancePath:instancePath+"/semantics/language",schemaPath:"#/properties/semantics/properties/language/const",keyword:"const",params:{allowedValue: "diffdevil-expr/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data2.numbers !== undefined){
if("diffdevil-number/1" !== data2.numbers){
const err12 = {instancePath:instancePath+"/semantics/numbers",schemaPath:"#/properties/semantics/properties/numbers/const",keyword:"const",params:{allowedValue: "diffdevil-number/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data2.replacementLines !== undefined){
if("replacement-lines-v1" !== data2.replacementLines){
const err13 = {instancePath:instancePath+"/semantics/replacementLines",schemaPath:"#/properties/semantics/properties/replacementLines/const",keyword:"const",params:{allowedValue: "replacement-lines-v1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data2.paths !== undefined){
if("diffdevil-glob/1" !== data2.paths){
const err14 = {instancePath:instancePath+"/semantics/paths",schemaPath:"#/properties/semantics/properties/paths/const",keyword:"const",params:{allowedValue: "diffdevil-glob/1"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data2.presets !== undefined){
let data7 = data2.presets;
if(Array.isArray(data7)){
const len0 = data7.length;
for(let i0=0; i0<len0; i0++){
if(typeof data7[i0] !== "string"){
const err15 = {instancePath:instancePath+"/semantics/presets/" + i0,schemaPath:"#/properties/semantics/properties/presets/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath:instancePath+"/semantics/presets",schemaPath:"#/properties/semantics/properties/presets/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data2.limits !== undefined){
if(typeof data2.limits !== "string"){
const err17 = {instancePath:instancePath+"/semantics/limits",schemaPath:"#/properties/semantics/properties/limits/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath:instancePath+"/semantics",schemaPath:"#/properties/semantics/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.reportId !== undefined){
if(typeof data.reportId !== "string"){
const err19 = {instancePath:instancePath+"/reportId",schemaPath:"#/properties/reportId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.source !== undefined){
let data11 = data.source;
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.kind === undefined){
const err20 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data11.comparisonId === undefined){
const err21 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "comparisonId"},message:"must have required property '"+"comparisonId"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data11.kind !== undefined){
let data12 = data11.kind;
if(!(((data12 === "git") || (data12 === "unified-diff")) || (data12 === "github-api"))){
const err22 = {instancePath:instancePath+"/source/kind",schemaPath:"#/properties/source/properties/kind/enum",keyword:"enum",params:{allowedValues: schema33.properties.source.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data11.comparisonId !== undefined){
let data13 = data11.comparisonId;
if(typeof data13 === "string"){
if(func1(data13) < 1){
const err23 = {instancePath:instancePath+"/source/comparisonId",schemaPath:"#/properties/source/properties/comparisonId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
else {
const err24 = {instancePath:instancePath+"/source/comparisonId",schemaPath:"#/properties/source/properties/comparisonId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data11.base !== undefined){
if(typeof data11.base !== "string"){
const err25 = {instancePath:instancePath+"/source/base",schemaPath:"#/properties/source/properties/base/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data11.head !== undefined){
if(typeof data11.head !== "string"){
const err26 = {instancePath:instancePath+"/source/head",schemaPath:"#/properties/source/properties/head/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data11.comparison !== undefined){
let data16 = data11.comparison;
if(!(((((data16 === "three-dot") || (data16 === "direct")) || (data16 === "worktree")) || (data16 === "staged")) || (data16 === "supplied"))){
const err27 = {instancePath:instancePath+"/source/comparison",schemaPath:"#/properties/source/properties/comparison/enum",keyword:"enum",params:{allowedValues: schema33.properties.source.properties.comparison.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data11.repository !== undefined){
if(typeof data11.repository !== "string"){
const err28 = {instancePath:instancePath+"/source/repository",schemaPath:"#/properties/source/properties/repository/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data11.pullRequest !== undefined){
let data18 = data11.pullRequest;
if(!(((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18))) && (isFinite(data18)))){
const err29 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if((typeof data18 == "number") && (isFinite(data18))){
if(data18 > 9007199254740991 || isNaN(data18)){
const err30 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data18 < 0 || isNaN(data18)){
const err31 = {instancePath:instancePath+"/source/pullRequest",schemaPath:"#/properties/source/properties/pullRequest/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
}
}
else {
const err32 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.value !== undefined){
if(!(validate133(data.value, {instancePath:instancePath+"/value",parentData:data,parentDataProperty:"value",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate133.errors : vErrors.concat(validate133.errors);
errors = vErrors.length;
}
}
if(data.evidence !== undefined){
let data20 = data.evidence;
if(Array.isArray(data20)){
const len1 = data20.length;
for(let i1=0; i1<len1; i1++){
let data21 = data20[i1];
if(data21 && typeof data21 == "object" && !Array.isArray(data21)){
if(data21.code === undefined){
const err33 = {instancePath:instancePath+"/evidence/" + i1,schemaPath:"#/properties/evidence/items/required",keyword:"required",params:{missingProperty: "code"},message:"must have required property '"+"code"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data21.code !== undefined){
let data22 = data21.code;
if(typeof data22 === "string"){
if(func1(data22) < 1){
const err34 = {instancePath:instancePath+"/evidence/" + i1+"/code",schemaPath:"#/properties/evidence/items/properties/code/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
else {
const err35 = {instancePath:instancePath+"/evidence/" + i1+"/code",schemaPath:"#/properties/evidence/items/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data21.subject !== undefined){
if(typeof data21.subject !== "string"){
const err36 = {instancePath:instancePath+"/evidence/" + i1+"/subject",schemaPath:"#/properties/evidence/items/properties/subject/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data21.message !== undefined){
if(typeof data21.message !== "string"){
const err37 = {instancePath:instancePath+"/evidence/" + i1+"/message",schemaPath:"#/properties/evidence/items/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
}
else {
const err38 = {instancePath:instancePath+"/evidence/" + i1,schemaPath:"#/properties/evidence/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
else {
const err39 = {instancePath:instancePath+"/evidence",schemaPath:"#/properties/evidence/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
else {
const err40 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
validate132.errors = vErrors;
return errors === 0;
}
validate132.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
