// lib/Generator.js

const { getRepoList, getTagList } = require('./http')
const ora = require('ora')
const inquirer = require('inquirer')
const util = require('util')
const downloadGitRepo = require('download-git-repo')
const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')

// 添加加载动画
async function wrapLoading(fn, message, ...args) {
  // 使用 ora 初始化，传入提示信息 message
  const spinner = ora(message);
  // 开始加载动画
  spinner.start();

  try {
    // 执行传入方法 fn
    const result = await fn(...args);
    // 状态修改成功
    spinner.succeed();
    return result;
  } catch (error) {
    // 状态修改失败
    spinner.fail('Request failed, refetch ...')
  }
}

class Generator {
  constructor(name, targetDir) {
    // 目录名称
    this.name = name;
    // 创建位置
    this.targetDir = targetDir;

    // 对 download-git-repo 进行 promise 化改造
    this.downloadGitRepo = util.promisify(downloadGitRepo);
  }

  // 获取用户选择的模板
  // 1）从远程拉取模板数据
  // 2）用户选择自己新下载的模板名称
  // 3）return 用户选择的名称

  async getRepo() {
    // 1）从远程拉取模板数据
    // const repoList = await wrapLoading(getRepoList, 'waiting fetch template');
    const repoList = [
      { id: 1, name: 'vue2-template' }, 
      { id: 2, name: 'vue3-ts-vite-pinia' }
    ];
    if (!repoList) return;

    // 过滤我们需要的模板名称
    const repos = repoList.map(item => item.name);

    // 2）用户选择自己新下载的模板名称
    const { repo } = await inquirer.prompt({
      name: 'repo',
      type: 'list',
      choices: repos,
      message: 'Please choose a template to create project'
    })

    // 3）return 用户选择的名称
    return repo;
  }

  // 获取用户选择的版本
  // 1）基于 repo 结果，远程拉取对应的 tag 列表
  // 2）用户选择自己需要下载的 tag
  // 3）return 用户选择的 tag

  async getTag(repo) {
    // 1）基于 repo 结果，远程拉取对应的 tag 列表
    const tags = await wrapLoading(getTagList, 'waiting fetch tag', repo);
    // console.log(tags);
    if (!tags) return;

    // 过滤我们需要的 tag 名称
    const tagsList = tags.map(item => item.name);

    // 2）用户选择自己需要下载的 tag
    const { tag } = await inquirer.prompt({
      name: 'tag',
      type: 'list',
      choices: tagsList,
      message: 'Place choose a tag to create project'
    })

    // 3）return 用户选择的 tag
    return tag
  }

  // 下载远程模板
  // 1）拼接下载地址
  // 2）调用下载方法
  async download(repo, targetAir, params) {

    // 拼接下载地址
    let requestUrl = `https://github.com:zh317626/${repo}#master`;
    // const requestUrl = `https://github.com:zh317626/json-tool#test`;
    if (repo == 'vue2-electron-template') {
      requestUrl = `https://github.com:zh317626/${repo}#master`;
      return console.log(`\r\n${chalk.red('Error:')} vue2-electron-template for the time being underdevelopment`);
    }

    const spinner = ora('Downloading the template, please wait...');
    // 开始加载动画
    spinner.start();

    downloadGitRepo(requestUrl, path.resolve(process.cwd(), this.targetDir), (err) => {
      // console.log(err ? 'Error' : 'Success')
      if (err) {
        spinner.fail()
        console.log(err)
        console.log(`\r\n${chalk.red('Error:')} Project creation failure ${chalk.cyan(this.name)}`);
      } else {
        spinner.succeed();

        const jsonPath = `${targetAir}/package.json`;
        // const jsonPath = require(`/template/package.json`);
        let jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        jsonContent = JSON.parse(jsonContent);
        jsonContent = Object.assign({}, jsonContent, params);
        fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, "", "\t"));
        // 删除文件
        fs.unlink(`${targetAir}/README.md`, err => { });
        fs.unlink(`${targetAir}/yarn.lock`, err => { });

        // 4）模板使用提示
        console.log(`\r\nSuccessfully created project ${chalk.cyan(this.name)}`)
        console.log(`\r\n  cd ${chalk.cyan(this.name)}`)
        console.log('  npm install\r\n')
        console.log(`  npm run ${repo.indexOf('vite') !== -1 ? chalk.cyan('dev') : chalk.cyan('serve')}\r\n`)
      }
    })

    // 2）调用下载方法
    // await wrapLoading(
    //   this.downloadGitRepo, // 远程下载方法
    //   'waiting download template', // 加载提示信息
    //   requestUrl, // 参数1: 下载地址
    //   path.resolve(process.cwd(), this.targetDir)) // 参数2: 创建位置
  }

  // 核心创建逻辑
  // 1）获取模板名称
  // 2）获取 tag 名称
  // 3）下载模板到模板目录
  async create(targetAir) {

    // 1）获取模板名称
    const repo = await this.getRepo();

    console.log(`\r\nYou chose the ${chalk.cyan(repo)} template`)

    let res = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: `package name: (${this.name})`,
        default: this.name,
      },
      {
        type: 'input',
        name: 'description',
        message: 'description',
        default: '',
      },
      {
        type: 'input',
        name: 'author',
        message: 'author',
        default: '',
      },
      {
        type: 'input',
        name: 'version',
        message: 'version',
        default: '1.0.0',
      },
      // {
      //   type: 'confirm',
      //   name: '判断',
      //   message: 'confirm',
      //   default: '1.0.0',
      // },
      // {
      //   type: 'password',
      //   name: '密码框',
      //   message: 'password',
      //   default: '1.0.0',
      // },
      // {
      //   type: 'checkbox',
      //   name: '多选',
      //   message: 'checkbox',
      //   choices: [
      //     { name: '1', value: 1 },
      //     { name: '2', value: 2 },
      //     { name: '3', value: 3 }
      //   ],
      //   default: '1.0.0',
      // },
    ]);

    // 2) 获取 tag 名称
    // const tag = await this.getTag(repo)

    // 3）下载模板到模板目录
    // await this.download(repo, tag)
    // console.log(res);
    
    // var ui = new inquirer.ui.BottomBar();
    // ui.log.write('something just happened.');
    // ui.log.write('Almost over, standby!');
    // ui.updateBottomBar('new bottom bar content'+ chalk.cyan(this.name)); 
    await this.download(repo, targetAir, res);

    // // 4）模板使用提示
    // console.log(`\r\nSuccessfully created project ${chalk.cyan(this.name)}`)
    // console.log(`\r\n  cd ${chalk.cyan(this.name)}`)
    // console.log('  npm run dev\r\n')
  }
}

module.exports = Generator;
