const express = require("express");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const { User, Posts, Comment, Like } = require("./models");
const authMiddleware = require("./middlewares/auth-middleware");

const app = express();
const router = express.Router();

router.post("/signup", async (req, res) => {
  const { nickname, email, password, confirmPassword } = req.body;

  const regExpNickName = /^[A-Za-z0-9]{3,}$/.test(nickname);
  if (!regExpNickName) {
    res.status(400).send({
        errorMessage: "닉네임 형식이 잘못되었습니다.",
    });

  }

  if (password !== confirmPassword) {
    res.status(400).send({
      errorMessage: "패스워드가 패스워드 확인란과 동일하지 않습니다.",
    });
    return;
  } // 비밀번호, 비밀번호 확인 비교

  const existUsers = await User.findAll({
    where: {
      [Op.or]: [{ nickname }, { email }],
    },
  });
  if (existUsers.length) {
    res.status(400).send({
      errorMessage: "이미 가입된 이메일 또는 닉네임이 있습니다.",
    });
    return;
  }

  const regExpPassword = /^[A-Za-z0-9]{4,}$/.test(nickname);
  if (!regExpPassword) {
    res.status(400).send({
        errorMessage: "비밀번호 형식이 맞지 않습니다.",
    });
    return;
  }
  if (password.search(nickname) > -1) {
    res.status(400).send({
        errorMessage: "비밀번호에 닉네임과 같은 값이 포함되어 있습니다.",
    });
    return;
  }

  await User.create({ email, nickname, password });

  res.status(201).send({
    reult: {
        success: true,
        msg : "회원가입에 성공하였습니다."
    }
  });
}); // 회원가입 끝


// 로그인 api
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email, password } });

  if (!user) {
    res.status(400).send({
      errorMessage: "이메일 또는 패스워드가 잘못됐습니다.",
    });
    return;
  }

  const token = jwt.sign({ userId: user.userId }, "my-secret-key");
  res.send({
    token,
  });
});

// router.get("/users/me", authMiddleware, async (req, res) => {
//   const { user } = res.locals;
//   res.send({
//     user,
//   });
// }); 

//회원가입 기능 끝

// const express = require("express");
// const Post = require("../schemas/post");
// const router = express.Router();

// 모든 게시글 데이터를 반환하는 함수
router.get("/post", async (req, res) => {
  try {
    const post_list = await Posts.findAll({
        order:[['createdAt', 'DESC']]
    });
    res.status(200).send({
        result: {
            post_list
        }
    });
}   catch(error) {
    return res.status(400).json({ error });
}

    });

//게시글 상세 조회
router.get("/:_postId", async (req, res) => {
    const { postId} = req.params;

    const existPost = await Posts.findOne({
        where: {
            postId,
        }
    });
});

if (!existPost) {
    res.stauts(400).send({
        success: false,
        errorMessage : "존재하지 않는 게시물입니다.",
    });
    return;
}

    const existLike = await Like.findOne({
        where: {
            postId,
            userId : existPost.userId
        }
    });

    const countLike = await Like.findAndCountall({
        where: {
            postId
        }
    });

    const existUser = await User.findOne({
        where: { userId: existPost.userId }
    });

    if (!existLike) {
        const likeByMe = false;
        res.status(200).send({
            result: {
                likeByMe,
                countLike: countLike.count,
                title: existPost.title,
                content: existPost.content,
                userId: existUser.nickname,
                postId: existPost.postId,

            }
        });
    } else {
        res.status(200).send({
            result: {
                likeByMe: existLike.done,
                countLike: countLike.count,
                title: existPost.title,
                content: existPost.content,
                userId: existUser.nickname,
                postId: existPost.postId,
            }
        });
    }  


//개시글 생성
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = res.locals.user;
    const { title, content, layout } = req.body;
    await Posts.create({ title, content, userId, layout });

    res.staus(201).send({
        reult: {
            success: true,
            msg: "게시글 작성이 완료되었습니다."
        }

    });
  } catch (error) {
    return res.status(400).json({
        reult: { 
            success: false,
            error
        }
    });
  }
});

//게시글 수정
router.put("/:_postId", async (req, res) => {
  try {
    const { userId } = res.locals.user;
    const { postId } = req.params;
    const { title, content, layout } = req.body;

    const existPost = await Posts.findOne({
        where: {
            postId,
        },
    });

    if(existPost.userId != userId) {
        res.send({
            result: {
                success: false,
                errorMessage: "게시글 작성자만 수정할 수 있습니다."
            }
        })
        return;
    }
    res.status(200).send({
        result: {
            success: true,
        }
    });
 }  catch (error) {
    console.log(error);
 }
});

// 게시글 삭제
router.delete("/:_postId", async (req, res) => {
  try {
    const { userId } = res.locals.user;
    const { postId } = req.params;

    const existPost = await Posts.findOne({
        where: {
            postId,
        },
    });

    if(existPost.userId != userId) {
        res.send(200).send({
            result: {
                success: false,
                errorMessage: "게시글 작성자만 삭제할 수 있습니다."
            }
        })
        return;
    }
        res.status(200).send({
            result: {
                success: true,
            }
        });
  } catch(error) {
    console.log(error);
  }

  
});

// 게시글 좋아요 api

router.get("/:postId/like", authMiddleware, async (req, res) => {
    const { userId } = res.locals.user;
    const { postId } = res.params;
    const { done } = req.body;

    const existLike = await Like.findOne ({
        where: {
            userId,
            postId,
        },

    });

    if (existLike) {
        if(existLike.done == true) {
            existLike.done = false;
            await existLike.save();
        } else {
            existLike.done = true;
            await existLike.save();
        }
    } else {
        await Like.create({
            userId,
            postId,
            done
        });
    }
    res.status(200).send({
        reult: {
            success: true
        }
    });

});

// 게시글 끝

// const express = require("express");
// const Comment = require("../schemas/comment");
// const router = express.Router();

//댓글 목록 조회
router.get("/:_postId", async (req, res) => {
  try {
    const _id = req.params._postId;

    if (!_id) { // TODO: Joi를 사용하지 않음
      res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
      return;
    }

    const comments = await Comment.find({ postId: _id }).sort({ createdAt: -1 });

    let resultList = [];

    for (const comment of comments) {
      resultList.push({
        commentId: comment._id,
        user: comment.user,
        content: comment.content,
        createdAt: comment.createdAt,
      });
    }

    res.status(200).json({ data: resultList });
  } catch (error) {
    const message = `${req.method} ${req.originalUrl} : ${error.message}`;
    console.log(message);
    res.status(400).json({ message });
  }
});

//댓글 생성
router.post("/:_postId", async (req, res) => {
  try {
    const _id = req.params._postId;

    const user = req.body["user"];
    const password = req.body["password"];
    const content = req.body["content"];

    if (!content) { // TODO: Joi를 사용하지 않음
      res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
      return;
    }

    if (!_id || !user || !password) { // TODO: Joi를 사용하지 않음
      res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
      return;
    }


    await Comment.create({ postId: _id, user, password, content });

    res.status(201).json({ message: "댓글을 생성하였습니다." });
  } catch (error) {
    const message = `${req.method} ${req.originalUrl} : ${error.message}`;
    console.log(message);
    res.status(400).json({ message });
  }
});

// 댓글 수정
router.put("/:_commentId", async (req, res) => {
  try {
    const _id = req.params._commentId;

    const password = req.body["password"];
    const content = req.body["content"];

    if (!content) { // TODO: Joi를 사용하지 않음
      res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
      return;
    }

    if (!_id || !password) { // TODO: Joi를 사용하지 않음
      res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
      return;
    }

    const isExist = await Comment.findOne({ _id, password });
    if (!isExist) {
      res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
      return;
    }

    await Comment.updateOne({ _id }, { $set: { content } });

    res.status(201).json({ message: "댓글을 수정하였습니다." });
  } catch (error) {
    const message = `${req.method} ${req.originalUrl} : ${error.message}`;
    console.log(message);
    res.status(400).json({ message });
  }
});

// 댓글 삭제
router.delete("/:_commentId", async (req, res) => {
  try {
    const _id = req.params._commentId;
    const password = req.body["password"];

    if (!_id || !password) { // TODO: Joi를 사용하지 않음
      res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
      return;
    }

    const isExist = await Comment.findOne({ _id, password });

    if (!isExist || !_id) {
      res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
      return;
    }

    await Comment.deleteOne({ _id });
    res.status(201).json({ message: "댓글을 삭제하였습니다." });
  } catch (error) {
    const message = `${req.method} ${req.originalUrl} : ${error.message}`;
    console.log(message);
    res.status(400).json({ message });
  }
});

app.use(express.json());
app.use("/api", express.urlencoded({ extended: false }), router);
// app.use(express.static("assets"));
app.listen(8080, () => {
  console.log("서버가 요청을 받을 준비가 됐어요");
});